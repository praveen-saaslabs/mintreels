import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TranscriptSegment } from '../entities/transcript-segment.entity';

@Injectable()
export class TranscriptSegmentRepository extends Repository<TranscriptSegment> {
  constructor(dataSource: DataSource) {
    super(TranscriptSegment, dataSource.createEntityManager());
  }

  async listByRecordingId(recordingId: number): Promise<TranscriptSegment[]> {
    return this.find({ where: { recordingId }, order: { sequence: 'ASC' } });
  }
}
