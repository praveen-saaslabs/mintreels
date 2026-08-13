import 'reflect-metadata';
import {
  ClipRepository,
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
import {
  createEmbeddingProvider,
  createLLMProvider,
  createSpeechProvider,
  createStorageProvider,
  createTranscriptVectorStoreProvider,
  createVectorStoreProvider,
} from './providers';

async function main(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();

  const deps = {
    recordings: new RecordingRepository(dataSource),
    clips: new ClipRepository(dataSource),
    jobs: new JobRepository(dataSource),
    jobSteps: new JobStepRepository(dataSource),
    jobAuditLogs: new JobAuditLogRepository(dataSource),
    transcripts: new TranscriptRepository(dataSource),
    segments: new TranscriptSegmentRepository(dataSource),
    summaries: new SummaryRepository(dataSource),
    hooks: new HookRepository(dataSource),
    speech: createSpeechProvider(),
    llm: createLLMProvider(),
    embeddings: createEmbeddingProvider(),
    vectorStore: createVectorStoreProvider(),
    transcriptVectorStore: createTranscriptVectorStoreProvider(),
    storage: createStorageProvider(),
  };

  const worker = createProcessors(deps);
  console.log(
    'MintReels worker listening on queue mintreels for ingest-video, render-clip, generate-hooks',
  );

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
