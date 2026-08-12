import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Recording } from '../entities/recording.entity';

@Injectable()
export class RecordingRepository extends Repository<Recording> {
  constructor(dataSource: DataSource) {
    super(Recording, dataSource.createEntityManager());
  }

  // TODO: implement recording persistence
  async list(): Promise<Recording[]> {
    throw new Error('RecordingRepository.list is not implemented');
  }

  async findById(_id: number): Promise<Recording | null> {
    throw new Error('RecordingRepository.findById is not implemented');
  }
}
