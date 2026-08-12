import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/http-error';

@Injectable()
export class HooksService {
  async listByRecordingId(_id: number): Promise<never> {
    notImplemented('hooksService.listByRecordingId');
  }

  async generate(_id: number): Promise<never> {
    notImplemented('hooksService.generate');
  }
}
