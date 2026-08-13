import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Clip,
  ClipRepository,
  Project,
  ProjectRepository,
  Recording,
  RecordingRepository,
  User,
  UserRepository,
} from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, Recording, Clip]), AuthModule],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    UserRepository,
    ProjectRepository,
    RecordingRepository,
    ClipRepository,
  ],
})
export class WorkspaceModule {}
