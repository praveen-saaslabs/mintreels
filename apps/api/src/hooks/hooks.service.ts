import { Injectable } from '@nestjs/common';
import { ClipRepository, HookRepository, RecordingRepository } from '@mintreels/db';
import { HttpError, notImplemented } from '../common/http-error';
import { toHookClipSummary } from '../clips/clips.service';

@Injectable()
export class HooksService {
  constructor(
    private readonly hooks: HookRepository,
    private readonly recordings: RecordingRepository,
    private readonly clips: ClipRepository,
  ) {}

  async listByRecordingId(recordingId: number, userId: number) {
    const recording = await this.recordings.findByIdForUser(recordingId, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    const [hooks, clips] = await Promise.all([
      this.hooks.listByRecordingId(recordingId),
      this.clips.listByRecordingId(recordingId),
    ]);
    const latestClipByHookId = new Map<number, (typeof clips)[number]>();
    for (const clip of clips) {
      if (clip.hookId == null) {
        continue;
      }
      if (!latestClipByHookId.has(clip.hookId)) {
        latestClipByHookId.set(clip.hookId, clip);
      }
    }

    return hooks.map((hook) => {
      const clip = latestClipByHookId.get(hook.id);
      return {
        id: hook.id,
        recordingId: hook.recordingId,
        title: hook.title,
        hook: hook.hook,
        reason: hook.reason,
        startMs: hook.startMs,
        endMs: hook.endMs,
        score: hook.score,
        createdAt: hook.createdAt,
        clip: clip ? toHookClipSummary(clip) : null,
      };
    });
  }

  async generate(_recordingId: number, _userId: number): Promise<never> {
    notImplemented('hooksService.generate');
  }
}
