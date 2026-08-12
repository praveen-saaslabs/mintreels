import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/http-error';

@Injectable()
export class SummariesService {
  async create(_recordingId: number): Promise<never> {
    notImplemented('summariesService.create');
  }
}
