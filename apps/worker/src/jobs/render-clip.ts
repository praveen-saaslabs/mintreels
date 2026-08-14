import { createHash } from 'node:crypto';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import type {
  ClipAspectRatio,
  ClipFitMode,
  JobStatus as DomainJobStatus,
} from '@mintreels/domain';
import { mixVoiceoverOntoVideo, renderClipVideo, segmentsToAss } from '@mintreels/media';
import { ClipFitMode as ClipFitModeEnum, ClipRatio, ClipStatus, JobStatus, JobType, type ClipVoiceover } from '@mintreels/schema';
import type { WorkerDeps } from '../pipeline/deps';
import { logPipeline, logPipelineError } from '../pipeline/log';
import { storeVideoThumbnail } from '../pipeline/video-thumbnail';

/** Match `@mintreels/media` TARGET_SIZE — ASS PlayRes must equal the encoded frame. */
const CLIP_FRAME_SIZE: Record<ClipAspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

const JOB_NAME = 'render-clip';

export interface RenderClipPayload {
  clipId: number;
  recordingId: number;
  jobId?: number;
  startMs: number;
  endMs: number;
  aspectRatio?: ClipAspectRatio;
  fitMode?: ClipFitMode;
  burnSubtitles?: boolean;
}

function logClip(
  recordingId: number,
  clipId: number,
  step: string,
  message: string,
  extras?: { jobId?: number; attempt?: number },
): void {
  logPipeline({
    job: JOB_NAME,
    recordingId,
    clipId,
    step,
    message,
    ...(extras?.jobId !== undefined ? { jobId: extras.jobId } : {}),
    ...(extras?.attempt !== undefined ? { attempt: extras.attempt } : {}),
  });
}

async function writeStreamToFile(stream: ReadableStream, filePath: string): Promise<void> {
  await pipeline(
    Readable.fromWeb(stream as unknown as WebReadableStream),
    createWriteStream(filePath),
  );
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function failMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }
  return 'Clip render failed';
}

function resolveAspectRatio(
  payload: RenderClipPayload,
  clipAspect: string | null | undefined,
): ClipAspectRatio {
  const candidate = payload.aspectRatio ?? clipAspect ?? ClipRatio.Vertical;
  if (
    candidate === ClipRatio.Vertical ||
    candidate === ClipRatio.Square ||
    candidate === ClipRatio.Widescreen
  ) {
    return candidate;
  }
  return ClipRatio.Vertical;
}

function resolveFitMode(
  payload: RenderClipPayload,
  clipFit: string | null | undefined,
): ClipFitMode {
  const candidate = payload.fitMode ?? clipFit ?? ClipFitModeEnum.Fit;
  if (candidate === ClipFitModeEnum.Fit || candidate === ClipFitModeEnum.Fill) {
    return candidate;
  }
  return ClipFitModeEnum.Fit;
}


function voiceoverScript(voiceover: ClipVoiceover, fallbackTitle: string): string {
  const title = (voiceover.titleText ?? fallbackTitle).trim();
  const cta = voiceover.ctaText?.trim() ?? '';
  if (title !== '' && cta !== '') {
    return `${title}. ${cta}`;
  }
  if (title !== '') {
    return title;
  }
  return cta;
}

function ttsCacheKey(voiceId: string, text: string): string {
  const hash = createHash('sha256').update(`${voiceId}\n${text}`).digest('hex').slice(0, 32);
  return `tts-cache/${hash}.mp3`;
}

async function resolveVoiceoverAudio(
  deps: WorkerDeps,
  voiceover: ClipVoiceover,
  text: string,
  outPath: string,
): Promise<void> {
  const cacheKey = ttsCacheKey(voiceover.voiceId, text);
  try {
    const cached = await deps.storage.download(cacheKey);
    await writeStreamToFile(cached, outPath);
    if (await fileExists(outPath)) {
      return;
    }
  } catch {
    // Cache miss — synthesize below.
  }

  const spoken = await deps.voice.synthesize({
    text,
    voiceId: voiceover.voiceId,
    format: 'mp3',
  });
  await writeFile(outPath, spoken.audio);
  try {
    await deps.storage.upload({
      key: cacheKey,
      body: spoken.audio,
      contentType: spoken.contentType,
    });
  } catch {
    // Cache upload is best-effort.
  }
}

export async function renderClip(payload: RenderClipPayload, deps: WorkerDeps): Promise<DomainJobStatus> {
  const clip = await deps.clips.findOneBy({ id: payload.clipId });
  if (!clip) {
    logClip(payload.recordingId, payload.clipId, 'load', 'clip missing no-op', {
      ...(payload.jobId !== undefined ? { jobId: payload.jobId } : {}),
    });
    return 'success';
  }

  const recording = await deps.recordings.findOneBy({ id: payload.recordingId });
  if (!recording) {
    logClip(payload.recordingId, payload.clipId, 'load', 'recording missing no-op', {
      ...(payload.jobId !== undefined ? { jobId: payload.jobId } : {}),
    });
    return 'success';
  }

  const job =
    payload.jobId !== undefined
      ? await deps.jobs.findOneBy({ id: payload.jobId })
      : await deps.jobs.findLatestByRecordingAndType(payload.recordingId, JobType.RenderClip);

  const jobExtras = {
    ...(job ? { jobId: job.id, attempt: job.attempt } : {}),
  };
  const clipDurationMs = Math.max(0, payload.endMs - payload.startMs);

  if (clip.status === ClipStatus.Ready && clip.storageKey) {
    logClip(payload.recordingId, payload.clipId, 'ready_short_circuit', 'already ready', jobExtras);
    if (!clip.thumbnailStorageKey) {
      logClip(payload.recordingId, payload.clipId, 'thumbnail', 'start backfill', jobExtras);
      const thumbKey = await storeVideoThumbnail({
        storage: deps.storage,
        videoStorageKey: clip.storageKey,
        localVideoPath: null,
        tmpDir: null,
        uploadKey: `clip-${String(clip.id)}-thumb.jpg`,
        durationMs: clipDurationMs,
      });
      if (thumbKey) {
        clip.thumbnailStorageKey = thumbKey;
        await deps.clips.save(clip);
        logClip(payload.recordingId, payload.clipId, 'thumbnail', 'done backfill', jobExtras);
      }
    }
    if (job && job.status !== JobStatus.Success) {
      job.status = JobStatus.Success;
      job.finishedAt = job.finishedAt ?? new Date();
      job.error = null;
      job.errorCode = null;
      await deps.jobs.save(job);
    }
    return 'success';
  }

  if (job) {
    job.status = JobStatus.Running;
    job.startedAt = job.startedAt ?? new Date();
    job.attempt += 1;
    job.error = null;
    job.errorCode = null;
    job.finishedAt = null;
    await deps.jobs.save(job);
    logClip(payload.recordingId, payload.clipId, 'mark_running', 'running', {
      jobId: job.id,
      attempt: job.attempt,
    });
  }

  clip.status = ClipStatus.Rendering;
  await deps.clips.save(clip);

  const tmpDir = await mkdtemp(join(tmpdir(), 'mintreels-clip-'));
  const videoPath = join(tmpDir, 'source.bin');
  const outputPath = join(tmpDir, `clip-${String(clip.id)}.mp4`);
  const voicePath = join(tmpDir, 'voiceover.mp3');
  const mixedPath = join(tmpDir, `clip-${String(clip.id)}-vo.mp4`);
  // ASS (not SRT/VTT): explicit PlayRes avoids giant FontSize from SRT’s 384×288 default.
  const assPath = join(tmpDir, `clip-${String(clip.id)}.ass`);

  const runExtras = {
    ...(job ? { jobId: job.id, attempt: job.attempt } : {}),
  };

  try {
    if (recording.storageKey.trim() === '') {
      throw new Error('Recording video is not available');
    }
    logClip(payload.recordingId, payload.clipId, 'download', 'start', runExtras);
    const stream = await deps.storage.download(recording.storageKey);
    await writeStreamToFile(stream, videoPath);
    if (!(await fileExists(videoPath))) {
      throw new Error('Failed to download recording video');
    }
    logClip(payload.recordingId, payload.clipId, 'download', 'done', runExtras);

    const aspectRatio = resolveAspectRatio(payload, clip.aspectRatio);
    const fitMode = resolveFitMode(payload, clip.fitMode);
    const burnSubtitles = payload.burnSubtitles ?? clip.burnSubtitles ?? true;
    const frame = CLIP_FRAME_SIZE[aspectRatio];

    let burnAssPath: string | undefined;
    if (burnSubtitles) {
      const segments = await deps.segments.listByRecordingId(payload.recordingId);
      const ass = segmentsToAss(segments, {
        startMs: payload.startMs,
        endMs: payload.endMs,
        rebaseToClip: true,
        playResX: frame.width,
        playResY: frame.height,
      });
      if (ass.includes('Dialogue:')) {
        await writeFile(assPath, ass, 'utf8');
        burnAssPath = assPath;
        logClip(payload.recordingId, payload.clipId, 'ass', 'cues written', runExtras);
      } else {
        logClip(payload.recordingId, payload.clipId, 'ass', 'burn on no cues', runExtras);
      }
    } else {
      logClip(payload.recordingId, payload.clipId, 'ass', 'burn off', runExtras);
    }

    logClip(
      payload.recordingId,
      payload.clipId,
      'ffmpeg',
      `start aspect=${aspectRatio} fit=${fitMode} rangeMs=${String(payload.startMs)}-${String(payload.endMs)}`,
      runExtras,
    );
    await renderClipVideo({
      inputPath: videoPath,
      outputPath,
      startMs: payload.startMs,
      endMs: payload.endMs,
      aspectRatio,
      fitMode,
      ...(burnAssPath ? { vttPath: burnAssPath } : {}),
    });
    logClip(payload.recordingId, payload.clipId, 'ffmpeg', 'done', runExtras);

    let finalPath = outputPath;
    const voiceover = clip.voiceover;
    if (voiceover?.enabled) {
      const script = voiceoverScript(voiceover, clip.title);
      if (script.trim() === '') {
        throw new Error('Voiceover text is empty');
      }
      logClip(payload.recordingId, payload.clipId, 'voiceover', 'start tts', runExtras);
      await resolveVoiceoverAudio(deps, voiceover, script, voicePath);
      await mixVoiceoverOntoVideo({
        videoPath: outputPath,
        voiceoverPath: voicePath,
        outputPath: mixedPath,
        placement: voiceover.placement,
      });
      finalPath = mixedPath;
      logClip(payload.recordingId, payload.clipId, 'voiceover', 'done mix', runExtras);
    }

    // Filestack store still buffers the body once; stream from disk avoids a prior readFile copy.
    logClip(payload.recordingId, payload.clipId, 'upload', 'start', runExtras);
    const stored = await deps.storage.upload({
      key: `clip-${String(clip.id)}.mp4`,
      body: Readable.toWeb(createReadStream(finalPath)) as ReadableStream,
      contentType: 'video/mp4',
    });
    logClip(payload.recordingId, payload.clipId, 'upload', 'done', runExtras);

    logClip(payload.recordingId, payload.clipId, 'thumbnail', 'start', runExtras);
    const thumbKey = await storeVideoThumbnail({
      storage: deps.storage,
      videoStorageKey: stored.key,
      localVideoPath: finalPath,
      tmpDir,
      uploadKey: `clip-${String(clip.id)}-thumb.jpg`,
      durationMs: clipDurationMs,
    });
    logClip(payload.recordingId, payload.clipId, 'thumbnail', 'done', runExtras);

    clip.storageKey = stored.key;
    clip.thumbnailStorageKey = thumbKey;
    clip.aspectRatio = aspectRatio as typeof clip.aspectRatio;
    clip.fitMode = fitMode as typeof clip.fitMode;
    clip.burnSubtitles = burnSubtitles;
    clip.status = ClipStatus.Ready;
    await deps.clips.save(clip);

    if (job) {
      job.status = JobStatus.Success;
      job.finishedAt = new Date();
      job.error = null;
      job.errorCode = null;
      await deps.jobs.save(job);
    }

    logClip(payload.recordingId, payload.clipId, 'ready', 'clip status ready', runExtras);
    return 'success';
  } catch (error: unknown) {
    const message = failMessage(error);
    clip.status = ClipStatus.Failed;
    await deps.clips.save(clip);
    if (job) {
      job.status = JobStatus.Failed;
      job.finishedAt = new Date();
      job.error = message;
      job.errorCode = 'RENDER_CLIP_FAILED';
      await deps.jobs.save(job);
    }
    logPipelineError({
      job: JOB_NAME,
      recordingId: payload.recordingId,
      clipId: payload.clipId,
      step: 'fail',
      message,
      ...(job ? { jobId: job.id, attempt: job.attempt } : {}),
    });
    throw error instanceof Error ? error : new Error(message);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
