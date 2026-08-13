import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { Hook } from '../entities/hook.entity';

@Injectable()
export class HookRepository extends Repository<Hook> {
  constructor(dataSource: DataSource) {
    super(Hook, dataSource.createEntityManager());
  }

  async listByRecordingId(recordingId: number): Promise<Hook[]> {
    return this.find({
      where: { recordingId },
      order: { score: 'DESC', id: 'ASC' },
    });
  }

  async listByRecordingIds(recordingIds: number[]): Promise<Hook[]> {
    if (recordingIds.length === 0) {
      return [];
    }
    return this.find({
      where: { recordingId: In(recordingIds) },
      select: ['id', 'recordingId'],
    });
  }
}
