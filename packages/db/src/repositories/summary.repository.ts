import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Summary } from '../entities/summary.entity';

@Injectable()
export class SummaryRepository extends Repository<Summary> {
  constructor(dataSource: DataSource) {
    super(Summary, dataSource.createEntityManager());
  }

  // TODO: implement summary persistence
  async findByRecordingId(_recordingId: number): Promise<Summary | null> {
    throw new Error('SummaryRepository.findByRecordingId is not implemented');
  }
}
