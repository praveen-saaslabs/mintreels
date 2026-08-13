import { Inject, Injectable } from '@nestjs/common';
import {
  ClipRepository,
  HookRepository,
  JobAuditLogRepository,
  JobRepository,
  RecordingRepository,
  type Clip,
} from '@mintreels/db';
import { DEFAULT_MAX_ATTEMPTS } from '@mintreels/domain';
import type { QueueProvider } from '@mintreels/queue';
import {
  CLIP_FILTER_LABELS,
  ClipFilterId,
  ClipRatio,
  ClipStatus,
  JobStatus,
  JobType,
} from '@mintreels/schema';
import { HttpError } from '../common/http-error';
import { publicPlaybackUrl } from '../common/playback-url';
import { QUEUE_PROVIDER } from '../providers/provider-tokens';
import { clipCreateGuard } from './clip-create-guard';
import type { CreateClipRequest } from './clips.dto';

const RENDER_QUEUE_MAX_ATTEMPTS = 3;

function clipRatio(width: number | null | undefined, height: number | null | undefined): ClipRatio | undefined {
  if (!width || !height) {
    return undefined;
  }
  if (height > width) {
    return ClipRatio.Vertical;
  }
  if (width === height) {
    return ClipRatio.Square;
  }
  return ClipRatio.Widescreen;
}

export function toPublicClip(clip: Clip) {
  const recording = clip.recording;
  const project = recording?.project;
  const ratio = clipRatio(recording?.width, recording?.height);
  return {
    id: clip.id,
    title: clip.title,
    recordingId: clip.recordingId,
    hookId: clip.hookId,
    projectId: recording?.projectId ?? project?.id ?? 0,
    projectName: project?.name ?? '',
    recordingTitle: recording?.title ?? '',
    startMs: clip.startMs,
    endMs: clip.endMs,
    status: clip.status,
    subtitleStyle: clip.subtitleStyle,
    videoUrl: publicPlaybackUrl(clip.storageKey),
    thumbnailUrl: publicPlaybackUrl(clip.thumbnailStorageKey),
    ...(ratio ? { ratio } : {}),
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
    @Inject(QUEUE_PROVIDER) private readonly queue: QueueProvider,
  ) {}

  async create(body: CreateClipRequest, userId: number) {
    const recording = await this.recordings.findOne({
      where: { id: body.recordingId, project: { userId } },
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

    const clip = await this.clips.save(
      this.clips.create({
        recordingId: recording.id,
        hookId,
        title: body.title,
        startMs: body.startMs,
        endMs: body.endMs,
        subtitleStyle: body.subtitleStyle ?? null,
        storageKey: null,
        thumbnailStorageKey: null,
        status: ClipStatus.Queued,
      }),
    );
    clip.recording = recording;
    await this.enqueueRender(clip);
    return toPublicClip(clip);
  }

  async exportFromHook(recordingId: number, hookId: number, userId: number) {
    const recording = await this.recordings.findOne({
      where: { id: recordingId, project: { userId } },
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

    const existing = await this.clips.findLatestByRecordingAndHookId(recordingId, hookId);
    if (existing) {
      if (existing.status === ClipStatus.Queued || existing.status === ClipStatus.Rendering) {
        existing.recording = existing.recording ?? recording;
        return toPublicClip(existing);
      }
      if (existing.status === ClipStatus.Ready) {
        existing.recording = existing.recording ?? recording;
        return toPublicClip(existing);
      }
      if (existing.status === ClipStatus.Failed) {
        existing.status = ClipStatus.Queued;
        existing.storageKey = null;
        existing.thumbnailStorageKey = null;
        existing.startMs = hook.startMs;
        existing.endMs = hook.endMs;
        existing.title = hook.title;
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
        startMs: hook.startMs,
        endMs: hook.endMs,
        subtitleStyle: null,
        storageKey: null,
        thumbnailStorageKey: null,
        status: ClipStatus.Queued,
      }),
    );
    clip.recording = recording;
    await this.enqueueRender(clip);
    return toPublicClip(clip);
  }

  async list(userId: number) {
    const clips = await this.clips.listForUser(userId);
    return clips.map(toPublicClip);
  }

  async listFilters(userId: number) {
    const clips = await this.clips.listForUser(userId);
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

  async getById(id: number, userId: number) {
    const clip = await this.clips.findByIdForUser(id, userId);
    if (!clip) {
      throw new HttpError(404, 'Not found');
    }
    return toPublicClip(clip);
  }

  async remove(id: number, userId: number): Promise<void> {
    const clip = await this.clips.findByIdForUser(id, userId);
    if (!clip) {
      throw new HttpError(404, 'Not found');
    }
    await this.clips.softRemove(clip);
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
        metadata: { clipId: clip.id },
      }),
    );

    await this.jobAuditLogs.save(
      this.jobAuditLogs.create({
        jobId: job.id,
        step: null,
        event: 'job_queued',
        message: 'RENDER_CLIP enqueued',
        metadata: { clipId: clip.id },
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
      },
      maxAttempts: RENDER_QUEUE_MAX_ATTEMPTS,
    });
  }
}
