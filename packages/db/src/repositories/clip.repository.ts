import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { Clip } from '../entities/clip.entity';

@Injectable()
export class ClipRepository extends Repository<Clip> {
  constructor(dataSource: DataSource) {
    super(Clip, dataSource.createEntityManager());
  }

  async listForUser(userId: number): Promise<Clip[]> {
    return this.find({
      where: { recording: { project: { userId } } },
      relations: { recording: { project: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async findByIdForUser(id: number, userId: number): Promise<Clip | null> {
    return this.findOne({
      where: { id, recording: { project: { userId } } },
      relations: { recording: { project: true } },
    });
  }

  async listByRecordingIds(recordingIds: number[]): Promise<Clip[]> {
    if (recordingIds.length === 0) {
      return [];
    }
    return this.find({
      where: { recordingId: In(recordingIds) },
      select: ['id', 'recordingId'],
    });
  }

  async listByRecordingId(recordingId: number): Promise<Clip[]> {
    return this.find({
      where: { recordingId },
      order: { createdAt: 'DESC' },
    });
  }

  async findLatestByRecordingAndHookId(recordingId: number, hookId: number): Promise<Clip | null> {
    return this.findOne({
      where: { recordingId, hookId },
      order: { createdAt: 'DESC' },
      relations: { recording: { project: true } },
    });
  }
}
