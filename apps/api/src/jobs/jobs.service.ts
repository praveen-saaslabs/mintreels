import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/http-error';

@Injectable()
export class JobsService {
  async enqueue(_type: string, _payload: Record<string, unknown>): Promise<never> {
    notImplemented('jobsService.enqueue');
  }
}
