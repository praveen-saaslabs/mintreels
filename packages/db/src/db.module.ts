import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDataSourceOptions, entities } from './data-source';
import {
  UserRepository,
  ProjectRepository,
  RecordingRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
  SummaryRepository,
  KnowledgeBaseRepository,
  KnowledgeDocumentRepository,
  HookRepository,
  ClipRepository,
  JobRepository,
} from './repositories';

const repositories = [
  UserRepository,
  ProjectRepository,
  RecordingRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
  SummaryRepository,
  KnowledgeBaseRepository,
  KnowledgeDocumentRepository,
  HookRepository,
  ClipRepository,
  JobRepository,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => createDataSourceOptions(),
    }),
    TypeOrmModule.forFeature([...entities]),
  ],
  providers: [...repositories],
  exports: [TypeOrmModule, ...repositories],
})
export class DbModule {}
