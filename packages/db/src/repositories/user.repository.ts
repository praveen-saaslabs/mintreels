import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<User | null> {
    return this.findOneBy({ id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOneBy({ email });
  }

  async list(): Promise<User[]> {
    return this.find();
  }
}
