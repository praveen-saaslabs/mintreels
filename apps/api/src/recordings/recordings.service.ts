import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/http-error';
import type { CreateRecordingRequest } from './recordings.dto';

@Injectable()
export class RecordingsService {
  async create(_body: CreateRecordingRequest): Promise<never> {
    notImplemented('recordingsService.create');
  }

  async list(): Promise<never> {
    notImplemented('recordingsService.list');
  }

  async getById(_id: number): Promise<never> {
    notImplemented('recordingsService.getById');
  }

  async remove(_id: number): Promise<never> {
    notImplemented('recordingsService.remove');
  }

  async addToGlobalKnowledgeBase(_id: number): Promise<never> {
    notImplemented('recordingsService.addToGlobalKnowledgeBase');
  }
}
