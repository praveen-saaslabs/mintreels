import type { LLMProvider } from '@mintreels/ai';
import {
  SOCIAL_COPY_DESCRIPTION_MAX,
  SOCIAL_COPY_EXCERPT_MAX_CHARS,
  SOCIAL_COPY_TITLE_MAX,
} from '@mintreels/ai';
import {
  ClipRepository,
  HookRepository,
  JobAuditLogRepository,
  JobRepository,
  ownerWhere,
  RecordingRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
  type Clip,
  type TranscriptSegment,
} from '@mintreels/db';
import { DEFAULT_MAX_ATTEMPTS } from '@mintreels/domain';
import type { QueueProvider } from '@mintreels/queue';
import {
  CLIP_FILTER_LABELS,
  ClipFilterId,
  ClipFitMode,
  ClipRatio,
  ClipStatus,
  JobStatus,
  JobType,
  type ClipVoiceover,
} from '@mintreels/schema';
import { Inject, Injectable } from '@nestjs/common';
import type { Ownership } from '../auth/auth.types';
import { HttpError } from '../common/http-error';
import { publicPlaybackUrl } from '../common/playback-url';
import { LLM_PROVIDER, QUEUE_PROVIDER } from '../providers/provider-tokens';
import { clipCreateGuard } from './clip-create-guard';
import type { CreateClipRequest, ExportHookClipRequest } from './clips.dto';

const RENDER_QUEUE_MAX_ATTEMPTS = 3;
const DEFAULT_ASPECT = ClipRatio.Vertical;
const DEFAULT_FIT_MODE = ClipFitMode.Fit;
const DEFAULT_BURN_SUBTITLES = true;

function buildTranscriptExcerpt(
  segments: readonly TranscriptSegment[],
  startMs: number,
  endMs: number,
): string {
  const overlapping = segments.filter(
    (segment) => segment.endMs > startMs && segment.startMs < endMs,
  );
  const text = overlapping
    .map((segment) => segment.text.trim())
    .filter((part) => part.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, SOCIAL_COPY_EXCERPT_MAX_CHARS);
}

function clampSocialFields(
  title: string,
  description: string,
): {
  socialTitle: string;
  socialDescription: string;
} {
  const socialTitle = title.trim().slice(0, SOCIAL_COPY_TITLE_MAX);
  const socialDescription = description.trim().slice(0, SOCIAL_COPY_DESCRIPTION_MAX);
  if (!socialTitle || !socialDescription) {
    throw new HttpError(502, 'SOCIAL_COPY_INVALID');
  }
  return { socialTitle, socialDescription };
}

function normalizeVoiceover(value: ClipVoiceover | null | undefined): ClipVoiceover | null {
  if (!value || !value.enabled) {
    return null;
  }
  // Legacy `duck` mixes are no longer supported — treat as before-video.
  const placement =
    (value as { placement?: string }).placement === 'post' ? 'post' : 'pre';
  return { ...value, placement };
}

function sameVoiceover(
  a: ClipVoiceover | null | undefined,
  b: ClipVoiceover | null | undefined,
): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function toPublicClip(clip: Clip) {
  const recording = clip.recording;
  const project = recording?.project;
  return {
    id: clip.id,
    title: clip.title,
    socialTitle: clip.socialTitle,
    socialDescription: clip.socialDescription,
    recordingId: clip.recordingId,
    hookId: clip.hookId,
    projectId: recording?.projectId ?? project?.id ?? 0,
    projectName: project?.name ?? '',
    recordingTitle: recording?.title ?? '',
    startMs: clip.startMs,
    endMs: clip.endMs,
    status: clip.status,
    aspectRatio: clip.aspectRatio,
    fitMode: clip.fitMode,
    burnSubtitles: clip.burnSubtitles,
    subtitleStyle: clip.subtitleStyle,
    voiceover: clip.voiceover ?? null,
    videoUrl: publicPlaybackUrl(clip.storageKey),
    thumbnailUrl: publicPlaybackUrl(clip.thumbnailStorageKey),
    /** Export target aspect (same as aspectRatio). */
    ratio: clip.aspectRatio,
  };
}

export function toHookClipSummary(clip: Clip) {
  return {
    id: clip.id,
    status: clip.status,
    videoUrl: publicPlaybackUrl(clip.storageKey),
    thumbnailUrl: publicPlaybackUrl(clip.thumbnailStorageKey),
  };
}

@Injectable()
export class ClipsService {
  constructor(
    private readonly clips: ClipRepository,
    private readonly recordings: RecordingRepository,
    private readonly hooks: HookRepository,
    private readonly jobs: JobRepository,
    private readonly jobAuditLogs: JobAuditLogRepository,
    private readonly transcripts: TranscriptRepository,
    private readonly segments: TranscriptSegmentRepository,
    @Inject(QUEUE_PROVIDER) private readonly queue: QueueProvider,
    @Inject(LLM_PROVIDER) private readonly llm: LLMProvider,
  ) {}

  async create(body: CreateClipRequest, owner: Ownership) {
    this.requireExportAuth(owner);
    const recording = await this.recordings.findOne({
      where: { id: body.recordingId, project: { ...ownerWhere(owner) } },
      relations: { project: true },
    });
    const guard = clipCreateGuard(recording, body.startMs, body.endMs);
    if (guard === 'not_found') {
      throw new HttpError(404, 'Not found');
    }
    if (guard === 'video_unavailable') {
      throw new HttpError(409, 'VIDEO_NOT_AVAILABLE');
    }
    if (guard === 'invalid_range') {
      throw new HttpError(400, 'INVALID_CLIP_RANGE');
    }
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }

    const hookId = body.hookId ?? null;
    if (hookId != null) {
      const hook = await this.hooks.findByIdAndRecordingId(hookId, recording.id);
      if (!hook) {
        throw new HttpError(404, 'Not found');
      }
    }

    const aspectRatio = body.aspectRatio ?? DEFAULT_ASPECT;
    const fitMode = body.fitMode ?? DEFAULT_FIT_MODE;
    const burnSubtitles = body.burnSubtitles ?? DEFAULT_BURN_SUBTITLES;

    const clip = await this.clips.save(
      this.clips.create({
        recordingId: recording.id,
        hookId,
        title: body.title,
        socialTitle: null,
        socialDescription: null,
        startMs: body.startMs,
        endMs: body.endMs,
        aspectRatio,
        fitMode,
        burnSubtitles,
        subtitleStyle: body.subtitleStyle ?? null,
        storageKey: null,
        thumbnailStorageKey: null,
        voiceover: normalizeVoiceover(body.voiceover),
        status: ClipStatus.Queued,
      }),
    );
    clip.recording = recording;
    await this.enqueueRender(clip);
    return toPublicClip(clip);
  }

  async exportFromHook(
    recordingId: number,
    hookId: number,
    owner: Ownership,
    options: ExportHookClipRequest = {},
  ) {
    this.requireExportAuth(owner);
    const recording = await this.recordings.findOne({
      where: { id: recordingId, project: { ...ownerWhere(owner) } },
      relations: { project: true },
    });
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    if (recording.storageKey.trim() === '') {
      throw new HttpError(409, 'VIDEO_NOT_AVAILABLE');
    }

    const hook = await this.hooks.findByIdAndRecordingId(hookId, recordingId);
    if (!hook) {
      throw new HttpError(404, 'Not found');
    }
    if (hook.startMs >= hook.endMs) {
      throw new HttpError(400, 'INVALID_HOOK_RANGE');
    }

    const aspectRatio = options.aspectRatio ?? DEFAULT_ASPECT;
    const fitMode = options.fitMode ?? DEFAULT_FIT_MODE;
    const burnSubtitles = options.burnSubtitles ?? DEFAULT_BURN_SUBTITLES;
    const subtitleStyle = options.subtitleStyle ?? null;
    const requestedVoiceover = normalizeVoiceover(options.voiceover);

    const existing = await this.clips.findLatestByRecordingAndHookId(recordingId, hookId);
    if (existing) {
      const sameRender =
        existing.aspectRatio === aspectRatio &&
        existing.fitMode === fitMode &&
        existing.burnSubtitles === burnSubtitles &&
        sameVoiceover(existing.voiceover, requestedVoiceover);
      if (
        sameRender &&
        (existing.status === ClipStatus.Queued || existing.status === ClipStatus.Rendering)
      ) {
        existing.recording = existing.recording ?? recording;
        return toPublicClip(existing);
      }
      if (sameRender && existing.status === ClipStatus.Ready) {
        existing.recording = existing.recording ?? recording;
        return toPublicClip(existing);
      }
      if (existing.status === ClipStatus.Failed || !sameRender) {
        existing.status = ClipStatus.Queued;
        existing.storageKey = null;
        existing.thumbnailStorageKey = null;
        existing.startMs = hook.startMs;
        existing.endMs = hook.endMs;
        existing.title = hook.title;
        existing.aspectRatio = aspectRatio;
        existing.fitMode = fitMode;
        existing.burnSubtitles = burnSubtitles;
        existing.subtitleStyle = subtitleStyle;
        existing.voiceover = requestedVoiceover;
        const saved = await this.clips.save(existing);
        saved.recording = recording;
        await this.enqueueRender(saved);
        return toPublicClip(saved);
      }
    }

    const clip = await this.clips.save(
      this.clips.create({
        recordingId: recording.id,
        hookId: hook.id,
        title: hook.title,
        socialTitle: null,
        socialDescription: null,
        startMs: hook.startMs,
        endMs: hook.endMs,
        aspectRatio,
        fitMode,
        burnSubtitles,
        subtitleStyle,
        storageKey: null,
        thumbnailStorageKey: null,
        voiceover: requestedVoiceover,
        status: ClipStatus.Queued,
      }),
    );
    clip.recording = recording;
    await this.enqueueRender(clip);
    return toPublicClip(clip);
  }

  async list(owner: Ownership) {
    const clips = await this.clips.listForOwner(owner);
    return clips.map(toPublicClip);
  }

  async listFilters(owner: Ownership) {
    const clips = await this.clips.listForOwner(owner);
    const counts = {
      [ClipFilterId.All]: clips.length,
      [ClipFilterId.Queued]: 0,
      [ClipFilterId.Rendering]: 0,
      [ClipFilterId.Ready]: 0,
      [ClipFilterId.Failed]: 0,
    };
    for (const clip of clips) {
      if (clip.status === ClipStatus.Queued) {
        counts[ClipFilterId.Queued] += 1;
      } else if (clip.status === ClipStatus.Rendering) {
        counts[ClipFilterId.Rendering] += 1;
      } else if (clip.status === ClipStatus.Ready) {
        counts[ClipFilterId.Ready] += 1;
      } else if (clip.status === ClipStatus.Failed) {
        counts[ClipFilterId.Failed] += 1;
      }
    }
    return [
      ClipFilterId.All,
      ClipFilterId.Queued,
      ClipFilterId.Rendering,
      ClipFilterId.Ready,
      ClipFilterId.Failed,
    ].map((id) => ({ id, label: CLIP_FILTER_LABELS[id], count: counts[id] }));
  }

  async getById(id: number, owner: Ownership) {
    const clip = await this.clips.findByIdForOwner(id, owner);
    if (!clip) {
      throw new HttpError(404, 'Not found');
    }
    return toPublicClip(clip);
  }

  async generateSocialCopy(id: number, owner: Ownership) {
    this.requireExportAuth(owner);
    const clip = await this.clips.findByIdForOwner(id, owner);
    if (!clip) {
      throw new HttpError(404, 'Not found');
    }
    if (clip.status !== ClipStatus.Ready || !publicPlaybackUrl(clip.storageKey)) {
      throw new HttpError(409, 'CLIP_NOT_READY');
    }

    const transcript = await this.transcripts.findByRecordingId(clip.recordingId);
    if (!transcript) {
      throw new HttpError(409, 'TRANSCRIPT_REQUIRED');
    }

    const segments = await this.segments.listByRecordingId(clip.recordingId);
    const excerpt = buildTranscriptExcerpt(segments, clip.startMs, clip.endMs);

    let hookTitle: string | null = null;
    let hookLine: string | null = null;
    let hookReason: string | null = null;
    if (clip.hookId != null) {
      const hook = await this.hooks.findByIdAndRecordingId(clip.hookId, clip.recordingId);
      if (hook) {
        hookTitle = hook.title;
        hookLine = hook.hook;
        hookReason = hook.reason;
      }
    }

    const recording = clip.recording;
    const generated = await this.llm.generateSocialCopy({
      clipTitle: clip.title,
      recordingTitle: recording?.title ?? '',
      startMs: clip.startMs,
      endMs: clip.endMs,
      transcriptExcerpt: excerpt,
      hookTitle,
      hookLine,
      hookReason,
    });

    const fields = clampSocialFields(generated.title, generated.description);
    clip.socialTitle = fields.socialTitle;
    clip.socialDescription = fields.socialDescription;
    const saved = await this.clips.save(clip);
    return toPublicClip(saved);
  }

  async remove(id: number, owner: Ownership): Promise<void> {
    const clip = await this.clips.findByIdForOwner(id, owner);
    if (!clip) {
      throw new HttpError(404, 'Not found');
    }
    await this.clips.softRemove(clip);
  }

  /**
   * Guests may upload, transcribe, edit and preview freely, but rendering/exporting
   * a clip is the login gate — the frontend catches AUTH_REQUIRED and resumes the
   * export after the guest signs in (their data is claimed on login).
   */
  private requireExportAuth(owner: Ownership): void {
    if (owner.userId == null) {
      throw new HttpError(401, 'AUTH_REQUIRED');
    }
  }

  private async enqueueRender(clip: Clip): Promise<void> {
    const job = await this.jobs.save(
      this.jobs.create({
        type: JobType.RenderClip,
        recordingId: clip.recordingId,
        status: JobStatus.Queued,
        attempt: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        error: null,
        errorCode: null,
        errorMetadata: null,
        currentStep: null,
        startedAt: null,
        finishedAt: null,
        metadata: {
          clipId: clip.id,
          aspectRatio: clip.aspectRatio,
          fitMode: clip.fitMode,
          burnSubtitles: clip.burnSubtitles,
        },
      }),
    );

    await this.jobAuditLogs.save(
      this.jobAuditLogs.create({
        jobId: job.id,
        step: null,
        event: 'job_queued',
        message: 'RENDER_CLIP enqueued',
        metadata: {
          clipId: clip.id,
          aspectRatio: clip.aspectRatio,
          fitMode: clip.fitMode,
          burnSubtitles: clip.burnSubtitles,
        },
      }),
    );

    await this.queue.enqueue({
      id: `render-clip-${String(job.id)}`,
      name: 'render-clip',
      payload: {
        clipId: clip.id,
        recordingId: clip.recordingId,
        jobId: job.id,
        startMs: clip.startMs,
        endMs: clip.endMs,
        aspectRatio: clip.aspectRatio,
        fitMode: clip.fitMode,
        burnSubtitles: clip.burnSubtitles,
      },
      maxAttempts: RENDER_QUEUE_MAX_ATTEMPTS,
    });
  }
}
