import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  // TODO: implement user persistence
  async list(): Promise<User[]> {
    throw new Error('UserRepository.list is not implemented');
  }

  async findById(_id: number): Promise<User | null> {
    throw new Error('UserRepository.findById is not implemented');
  }
}
