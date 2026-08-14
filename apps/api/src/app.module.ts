import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { DbModule } from '@mintreels/db';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { HttpLoggingInterceptor } from './common/http-logging.interceptor';
import { HealthController } from './health.controller';
import { migrations } from './migrations';
import { AuthModule } from './auth/auth.module';
import { ProvidersModule } from './providers/providers.module';
import { RecordingsModule } from './recordings/recordings.module';
import { MomentsModule } from './moments/moments.module';
import { TranscriptsModule } from './transcripts/transcripts.module';
import { SummariesModule } from './summaries/summaries.module';
import { HooksModule } from './hooks/hooks.module';
import { ClipsModule } from './clips/clips.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { JobsModule } from './jobs/jobs.module';
import { ProjectsModule } from './projects/projects.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { SettingsModule } from './settings/settings.module';
import { VoicesModule } from './voices/voices.module';

@Module({
  imports: [
    DbModule.forRoot({ migrations, migrationsRun: true }),
    ProvidersModule,
    AuthModule,
    RecordingsModule,
    MomentsModule,
    TranscriptsModule,
    SummariesModule,
    HooksModule,
    ClipsModule,
    KnowledgeModule,
    JobsModule,
    ProjectsModule,
    WorkspaceModule,
    SettingsModule,
    VoicesModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
})
export class AppModule {}
