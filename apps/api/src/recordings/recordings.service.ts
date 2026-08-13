import { Injectable } from '@nestjs/common';
import { RecordingRepository, type Recording } from '@mintreels/db';
import { HttpError, notImplemented } from '../common/http-error';
import type { CreateRecordingRequest } from './recordings.dto';

function toPublicRecording(recording: Recording) {
  return {
    id: recording.id,
    projectId: recording.projectId,
    title: recording.title,
    originalFilename: recording.originalFilename,
    durationMs: recording.durationMs,
    width: recording.width,
    height: recording.height,
    status: recording.status,
    createdAt: recording.createdAt,
    updatedAt: recording.updatedAt,
  };
}

@Injectable()
export class RecordingsService {
  constructor(private readonly recordings: RecordingRepository) {}

  async create(_body: CreateRecordingRequest, _userId: number): Promise<never> {
    notImplemented('recordingsService.create');
  }

  async list(userId: number) {
    const recordings = await this.recordings.listForUser(userId);
    return recordings.map(toPublicRecording);
  }

  async getById(id: number, userId: number) {
    const recording = await this.recordings.findByIdForUser(id, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    return toPublicRecording(recording);
  }

  async remove(id: number, userId: number): Promise<void> {
    const recording = await this.recordings.findByIdForUser(id, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    await this.recordings.remove(recording);
  }

  async addToGlobalKnowledgeBase(_id: number, _userId: number): Promise<never> {
    notImplemented('recordingsService.addToGlobalKnowledgeBase');
  }
}
