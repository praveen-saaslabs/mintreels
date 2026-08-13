import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Clip,
  ClipRepository,
  Hook,
  HookRepository,
  Job,
  JobRepository,
  KnowledgeBase,
  KnowledgeBaseRepository,
  KnowledgeDocument,
  KnowledgeDocumentRepository,
  Project,
  ProjectRepository,
  Recording,
  RecordingRepository,
} from '@mintreels/db';
import { AuthModule } from '../auth/auth.module';
import { RecordingsModule } from '../recordings/recordings.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Recording,
      Clip,
      Hook,
      KnowledgeBase,
      KnowledgeDocument,
      Job,
    ]),
    AuthModule,
    RecordingsModule,
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectRepository,
    RecordingRepository,
    ClipRepository,
    HookRepository,
    KnowledgeBaseRepository,
    KnowledgeDocumentRepository,
    JobRepository,
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
