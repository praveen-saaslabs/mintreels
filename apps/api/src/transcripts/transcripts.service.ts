import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/http-error';

@Injectable()
export class TranscriptsService {
  async getByRecordingId(_id: number): Promise<never> {
    notImplemented('transcriptsService.getByRecordingId');
  }

  async getVttByRecordingId(_id: number): Promise<never> {
    notImplemented('transcriptsService.getVttByRecordingId');
  }

  async getSummaryByRecordingId(_id: number): Promise<never> {
    notImplemented('transcriptsService.getSummaryByRecordingId');
  }
}
