import { Injectable } from '@nestjs/common';
import { RecordingRepository, SummaryRepository } from '@mintreels/db';
import { HttpError, notImplemented } from '../common/http-error';

@Injectable()
export class SummariesService {
  constructor(
    private readonly summaries: SummaryRepository,
    private readonly recordings: RecordingRepository,
  ) {}

  async getByRecordingId(recordingId: number, userId: number) {
    const recording = await this.recordings.findByIdForUser(recordingId, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    const summary = await this.summaries.findByRecordingId(recordingId);
    if (!summary) {
      throw new HttpError(404, 'Not found');
    }
    return {
      id: summary.id,
      recordingId: summary.recordingId,
      text: summary.text,
      createdAt: summary.createdAt,
    };
  }

  async create(_recordingId: number, _userId: number): Promise<never> {
    notImplemented('summariesService.create');
  }
}
