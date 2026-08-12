import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/http-error';
import type { CreateClipRequest } from './clips.dto';

@Injectable()
export class ClipsService {
  async create(_body: CreateClipRequest): Promise<never> {
    notImplemented('clipsService.create');
  }

  async getById(_id: number): Promise<never> {
    notImplemented('clipsService.getById');
  }
}
