import 'reflect-metadata';
import {
  createDataSource,
  HookRepository,
  JobAuditLogRepository,
  JobRepository,
  JobStepRepository,
  RecordingRepository,
  SummaryRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
} from '@mintreels/db';
import { createProcessors } from './processors';
import { createLLMProvider, createSpeechProvider, createStorageProvider } from './providers';

async function main(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();

  const deps = {
    recordings: new RecordingRepository(dataSource),
    jobs: new JobRepository(dataSource),
    jobSteps: new JobStepRepository(dataSource),
    jobAuditLogs: new JobAuditLogRepository(dataSource),
    transcripts: new TranscriptRepository(dataSource),
    segments: new TranscriptSegmentRepository(dataSource),
    summaries: new SummaryRepository(dataSource),
    hooks: new HookRepository(dataSource),
    speech: createSpeechProvider(),
    llm: createLLMProvider(),
    storage: createStorageProvider(),
  };

  const worker = createProcessors(deps);
  console.log('MintReels worker listening on queue mintreels for ingest-video');

  const shutdown = async () => {
    await worker.close();
    await dataSource.destroy();
  };
  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Worker failed to start';
  console.error(message);
  process.exitCode = 1;
});
