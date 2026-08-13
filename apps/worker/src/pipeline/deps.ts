import type {
  HookRepository,
  JobAuditLogRepository,
  JobRepository,
  JobStepRepository,
  RecordingRepository,
  SummaryRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
} from '@mintreels/db';
import type { LLMProvider, SpeechProvider } from '@mintreels/ai';
import type { StorageProvider } from '@mintreels/storage';

export interface WorkerDeps {
  recordings: RecordingRepository;
  jobs: JobRepository;
  jobSteps: JobStepRepository;
  jobAuditLogs: JobAuditLogRepository;
  transcripts: TranscriptRepository;
  segments: TranscriptSegmentRepository;
  summaries: SummaryRepository;
  hooks: HookRepository;
  speech: SpeechProvider;
  llm: LLMProvider;
  storage: StorageProvider;
}
