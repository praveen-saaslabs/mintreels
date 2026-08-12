import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Clip } from '../entities/clip.entity';

@Injectable()
export class ClipRepository extends Repository<Clip> {
  constructor(dataSource: DataSource) {
    super(Clip, dataSource.createEntityManager());
  }

  // TODO: implement clip persistence
  async findById(_id: number): Promise<Clip | null> {
    throw new Error('ClipRepository.findById is not implemented');
  }
}
