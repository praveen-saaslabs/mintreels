import { Injectable } from '@nestjs/common';
import { HookRepository, RecordingRepository } from '@mintreels/db';
import { HttpError, notImplemented } from '../common/http-error';

@Injectable()
export class HooksService {
  constructor(
    private readonly hooks: HookRepository,
    private readonly recordings: RecordingRepository,
  ) {}

  async listByRecordingId(recordingId: number, userId: number) {
    const recording = await this.recordings.findByIdForUser(recordingId, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    const hooks = await this.hooks.listByRecordingId(recordingId);
    return hooks.map((hook) => ({
      id: hook.id,
      recordingId: hook.recordingId,
      title: hook.title,
      hook: hook.hook,
      reason: hook.reason,
      startMs: hook.startMs,
      endMs: hook.endMs,
      score: hook.score,
      createdAt: hook.createdAt,
    }));
  }

  async generate(_recordingId: number, _userId: number): Promise<never> {
    notImplemented('hooksService.generate');
  }
}
