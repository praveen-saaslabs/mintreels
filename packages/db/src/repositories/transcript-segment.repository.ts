import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TranscriptSegment } from '../entities/transcript-segment.entity';

@Injectable()
export class TranscriptSegmentRepository extends Repository<TranscriptSegment> {
  constructor(dataSource: DataSource) {
    super(TranscriptSegment, dataSource.createEntityManager());
  }

  // TODO: implement transcript segment persistence
  async listByRecordingId(_recordingId: number): Promise<TranscriptSegment[]> {
    throw new Error('TranscriptSegmentRepository.listByRecordingId is not implemented');
  }
}
