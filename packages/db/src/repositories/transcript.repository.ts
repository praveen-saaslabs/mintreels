import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Transcript } from '../entities/transcript.entity';

@Injectable()
export class TranscriptRepository extends Repository<Transcript> {
  constructor(dataSource: DataSource) {
    super(Transcript, dataSource.createEntityManager());
  }

  async findByRecordingId(recordingId: number): Promise<Transcript | null> {
    return this.findOne({ where: { recordingId } });
  }
}
