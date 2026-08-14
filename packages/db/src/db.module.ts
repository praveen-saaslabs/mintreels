import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDataSourceOptions, entities } from './data-source';
import type { MigrationClass } from './data-source';
import {
  UserRepository,
  GuestSessionRepository,
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
  JobStepRepository,
  JobAuditLogRepository,
} from './repositories';

const repositories = [
  UserRepository,
  GuestSessionRepository,
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
  JobStepRepository,
  JobAuditLogRepository,
];

export interface DbModuleOptions {
  migrations?: MigrationClass[];
  migrationsRun?: boolean;
}

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
export class DbModule {
  static forRoot(options: DbModuleOptions = {}): DynamicModule {
    return {
      module: DbModule,
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: () =>
            createDataSourceOptions(undefined, {
              migrations: options.migrations,
              migrationsRun: options.migrationsRun,
            }),
        }),
        TypeOrmModule.forFeature([...entities]),
      ],
      providers: [...repositories],
      exports: [TypeOrmModule, ...repositories],
    };
  }
}
