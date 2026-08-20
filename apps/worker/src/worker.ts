import 'reflect-metadata';
import {
  ClipRepository,
  createDataSource,
  GuestSessionRepository,
  HookRepository,
  JobAuditLogRepository,
  JobRepository,
  JobStepRepository,
  KnowledgeBaseRepository,
  KnowledgeDocumentRepository,
  ProjectRepository,
  RecordingRepository,
  SummaryRepository,
  SystemSettingsRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
} from '@mintreels/db';
import { createProcessors } from './processors';
import { startGuestCleanup } from './tasks/guest-cleanup';
import {
  createEmbeddingProvider,
  createLLMProvider,
  createSpeechProvider,
  createStorageProvider,
  createTranscriptVectorStoreProvider,
  createVectorStoreProvider,
  createVoiceProvider,
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
    systemSettings: new SystemSettingsRepository(dataSource),
    speech: createSpeechProvider(),
    voice: createVoiceProvider(),
    llm: createLLMProvider(),
    embeddings: createEmbeddingProvider(),
    vectorStore: createVectorStoreProvider(),
    transcriptVectorStore: createTranscriptVectorStoreProvider(),
    storage: createStorageProvider(),
  };

  const worker = createProcessors(deps);
  console.log(
    'MintReels worker listening on queue mintreels for ingest-video, render-clip, export-recording, generate-hooks, apply-overdub, apply-recording-voiceover',
  );

  const guestCleanup = startGuestCleanup({
    guestSessions: new GuestSessionRepository(dataSource),
    projects: new ProjectRepository(dataSource),
    recordings: deps.recordings,
    clips: deps.clips,
    hooks: deps.hooks,
    jobs: deps.jobs,
    jobSteps: deps.jobSteps,
    jobAuditLogs: deps.jobAuditLogs,
    transcripts: deps.transcripts,
    segments: deps.segments,
    summaries: deps.summaries,
    knowledgeBases: new KnowledgeBaseRepository(dataSource),
    knowledgeDocuments: new KnowledgeDocumentRepository(dataSource),
    vectorStore: deps.vectorStore,
    transcriptVectorStore: deps.transcriptVectorStore,
  });

  const shutdown = async () => {
    guestCleanup.stop();
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
