import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DbModule } from '@mintreels/db';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { HealthController } from './health.controller';
import { ProvidersModule } from './providers/providers.module';
import { RecordingsModule } from './recordings/recordings.module';
import { TranscriptsModule } from './transcripts/transcripts.module';
import { SummariesModule } from './summaries/summaries.module';
import { HooksModule } from './hooks/hooks.module';
import { ClipsModule } from './clips/clips.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    DbModule,
    ProvidersModule,
    RecordingsModule,
    TranscriptsModule,
    SummariesModule,
    HooksModule,
    ClipsModule,
    KnowledgeModule,
    JobsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
