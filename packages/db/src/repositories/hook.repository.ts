import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Hook } from '../entities/hook.entity';

@Injectable()
export class HookRepository extends Repository<Hook> {
  constructor(dataSource: DataSource) {
    super(Hook, dataSource.createEntityManager());
  }

  // TODO: implement hook persistence
  async listByRecordingId(_recordingId: number): Promise<Hook[]> {
    throw new Error('HookRepository.listByRecordingId is not implemented');
  }
}
