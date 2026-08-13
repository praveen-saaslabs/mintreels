import type {
  ClipRepository,
  HookRepository,
  JobAuditLogRepository,
  JobRepository,
  JobStepRepository,
  RecordingRepository,
  SummaryRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
} from '@mintreels/db';
import type {
  EmbeddingProvider,
  LLMProvider,
  SpeechProvider,
  VectorStoreProvider,
} from '@mintreels/ai';
import type { StorageProvider } from '@mintreels/storage';

export interface WorkerDeps {
  recordings: RecordingRepository;
  clips: ClipRepository;
  jobs: JobRepository;
  jobSteps: JobStepRepository;
  jobAuditLogs: JobAuditLogRepository;
  transcripts: TranscriptRepository;
  segments: TranscriptSegmentRepository;
  summaries: SummaryRepository;
  hooks: HookRepository;
  speech: SpeechProvider;
  llm: LLMProvider;
  embeddings: EmbeddingProvider;
  vectorStore: VectorStoreProvider;
  storage: StorageProvider;
}
