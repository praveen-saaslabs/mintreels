import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Summary } from '../entities/summary.entity';

@Injectable()
export class SummaryRepository extends Repository<Summary> {
  constructor(dataSource: DataSource) {
    super(Summary, dataSource.createEntityManager());
  }

  async findByRecordingId(recordingId: number): Promise<Summary | null> {
    return this.findOne({ where: { recordingId } });
  }
}
