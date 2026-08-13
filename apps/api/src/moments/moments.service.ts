import { Inject, Injectable } from '@nestjs/common';
import type { EmbeddingProvider, LLMProvider, VectorStoreProvider } from '@mintreels/ai';
import type { Transcript as DomainTranscript, TranscriptSegment as DomainSegment } from '@mintreels/domain';
import {
  JobRepository,
  JobStepRepository,
  RecordingRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
  type Recording,
  type TranscriptSegment,
} from '@mintreels/db';
import {
  JobStepName,
  JobStepStatus,
  JobType,
  type AskMomentsRequest,
  type AskMomentsResponse,
  type SearchMomentsRequest,
} from '@mintreels/schema';
import { HttpError } from '../common/http-error';
import {
  EMBEDDING_PROVIDER,
  LLM_PROVIDER,
  TRANSCRIPT_VECTOR_STORE_PROVIDER,
} from '../providers/provider-tokens';
import { loadMomentSearchConfig } from './moments.config';
import { isTranscriptIndexReady, toMomentCandidates } from './moment-results';

function toDomainTranscript(recordingId: number, transcriptId: number, rows: TranscriptSegment[]): DomainTranscript {
  const segments: DomainSegment[] = rows.map((row) => {
    const segment: DomainSegment = {
      id: row.id,
      sequence: row.sequence,
      startMs: row.startMs,
      endMs: row.endMs,
      text: row.text,
    };
    if (row.speaker) {
      segment.speaker = row.speaker;
    }
    return segment;
  });
  return { id: transcriptId, recordingId, segments };
}

@Injectable()
export class MomentsService {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly transcripts: TranscriptRepository,
    private readonly segments: TranscriptSegmentRepository,
    private readonly jobs: JobRepository,
    private readonly jobSteps: JobStepRepository,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    @Inject(TRANSCRIPT_VECTOR_STORE_PROVIDER) private readonly transcriptVectors: VectorStoreProvider,
    @Inject(LLM_PROVIDER) private readonly llm: LLMProvider,
  ) {}

  async search(recordingId: number, userId: number, body: SearchMomentsRequest) {
    const recording = await this.requireOwnedRecording(recordingId, userId);
    await this.requireTranscript(recordingId);
    return { moments: await this.findMoments(recording, body.query, body.limit) };
  }

  async ask(recordingId: number, userId: number, body: AskMomentsRequest): Promise<AskMomentsResponse> {
    const recording = await this.requireOwnedRecording(recordingId, userId);
    const transcriptRow = await this.requireTranscript(recordingId);
    const segments = await this.segments.listByRecordingId(recordingId);
    const routed = await this.llm.askTranscript(
      toDomainTranscript(recordingId, transcriptRow.id, segments),
      body.query,
    );

    if (routed.intent === 'question') {
      return { kind: 'answer', text: routed.text };
    }
    if (routed.intent === 'other') {
      return { kind: 'reject', text: routed.text };
    }

    const moments = await this.findMoments(recording, routed.clipQuery || body.query, body.limit);
    return { kind: 'moments', moments };
  }

  private async requireOwnedRecording(recordingId: number, userId: number): Promise<Recording> {
    const recording = await this.recordings.findByIdForUser(recordingId, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    return recording;
  }

  private async requireTranscript(recordingId: number) {
    const transcript = await this.transcripts.findByRecordingId(recordingId);
    if (!transcript) {
      throw new HttpError(409, 'TRANSCRIPT_REQUIRED');
    }
    return transcript;
  }

  private async findMoments(recording: Recording, query: string, requestedLimit?: number) {
    const ingestJob = await this.jobs.findLatestByRecordingAndType(recording.id, JobType.VideoIngest);
    const steps = ingestJob ? await this.jobSteps.listByJobId(ingestJob.id) : [];
    const embedStep = steps.find((step) => step.step === JobStepName.TranscriptEmbeddings);
    if (!isTranscriptIndexReady(embedStep?.status)) {
      throw new HttpError(409, 'TRANSCRIPT_INDEX_NOT_READY');
    }
    if (embedStep?.status === JobStepStatus.Skipped) {
      return [];
    }

    const config = loadMomentSearchConfig();
    const limit = Math.min(Math.max(1, requestedLimit ?? config.limit), config.limit);
    const [queryVector] = await this.embeddings.embed([query]);
    if (!queryVector) {
      throw new HttpError(500, 'Internal server error');
    }

    const hits = await this.transcriptVectors.search(queryVector, {
      recordingId: recording.id,
      limit,
      minimumSimilarity: config.minimumSimilarity,
    });
    const segments = await this.segments.listByRecordingId(recording.id);
    return toMomentCandidates(hits, segments, {
      preRollMs: config.preRollMs,
      postRollMs: config.postRollMs,
      recordingDurationMs: recording.durationMs,
    });
  }
}
