import { Injectable } from '@nestjs/common';
import { RecordingRepository } from '@mintreels/db';
import { HttpError, notImplemented } from '../common/http-error';
import type { CreateRecordingRequest } from './recordings.dto';

@Injectable()
export class RecordingsService {
  constructor(private readonly recordings: RecordingRepository) {}

  async create(_body: CreateRecordingRequest, _userId: number): Promise<never> {
    notImplemented('recordingsService.create');
  }

  async list(userId: number) {
    return this.recordings.listForUser(userId);
  }

  async getById(id: number, userId: number) {
    const recording = await this.recordings.findByIdForUser(id, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    return recording;
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
