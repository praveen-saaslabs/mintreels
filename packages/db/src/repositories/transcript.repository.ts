import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Transcript } from '../entities/transcript.entity';

@Injectable()
export class TranscriptRepository extends Repository<Transcript> {
  constructor(dataSource: DataSource) {
    super(Transcript, dataSource.createEntityManager());
  }

  // TODO: implement transcript persistence
  async findByRecordingId(_recordingId: number): Promise<Transcript | null> {
    throw new Error('TranscriptRepository.findByRecordingId is not implemented');
  }
}
