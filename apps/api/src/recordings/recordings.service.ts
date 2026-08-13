import { Inject, Injectable } from '@nestjs/common';
import {
  HookRepository,
  JobAuditLogRepository,
  JobRepository,
  JobStepRepository,
  ProjectRepository,
  RecordingRepository,
  SummaryRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
  type Recording,
} from '@mintreels/db';
import { DEFAULT_MAX_ATTEMPTS } from '@mintreels/domain';
import type { QueueProvider } from '@mintreels/queue';
import { parseFilestackRef } from '@mintreels/storage';
import {
  JOB_STEP_NAMES,
  JobStatus,
  JobStepStatus,
  JobType,
  RecordingStatus,
} from '@mintreels/schema';
import { HttpError } from '../common/http-error';
import { QUEUE_PROVIDER } from '../providers/provider-tokens';
import type { CreateRecordingRequest } from './recordings.dto';

function toPublicRecording(recording: Recording) {
  return {
    id: recording.id,
    projectId: recording.projectId,
    title: recording.title,
    originalFilename: recording.originalFilename,
    durationMs: recording.durationMs,
    width: recording.width,
    height: recording.height,
    status: recording.status,
    videoUrl: recording.storageKey,
    audioUrl: recording.audioStorageKey,
    createdAt: recording.createdAt,
    updatedAt: recording.updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function msToSeconds(ms: number): number {
  return ms / 1000;
}

type StoredWord = { word: string; startMs: number; endMs: number; speaker?: string };
type StoredFormats = { srt?: string; vtt?: string };

function readTranscriptExtras(raw: unknown): {
  words: StoredWord[];
  formats?: StoredFormats;
  speakerCount?: number;
} {
  if (!isRecord(raw)) {
    return { words: [] };
  }
  const words = Array.isArray(raw.words)
    ? raw.words.filter((item): item is StoredWord => {
        if (!isRecord(item)) return false;
        return (
          typeof item.word === 'string' &&
          typeof item.startMs === 'number' &&
          typeof item.endMs === 'number'
        );
      })
    : [];
  const extras: { words: StoredWord[]; formats?: StoredFormats; speakerCount?: number } = { words };
  if (isRecord(raw.formats)) {
    const formats: StoredFormats = {};
    if (typeof raw.formats.srt === 'string') {
      formats.srt = raw.formats.srt;
    }
    if (typeof raw.formats.vtt === 'string') {
      formats.vtt = raw.formats.vtt;
    }
    if (formats.srt !== undefined || formats.vtt !== undefined) {
      extras.formats = formats;
    }
  }
  if (typeof raw.speakerCount === 'number' && Number.isFinite(raw.speakerCount)) {
    extras.speakerCount = raw.speakerCount;
  }
  return extras;
}

function toPublicTranscript(
  transcript: {
    id: number;
    language: string | null;
    text: string | null;
    durationMs: number | null;
    rawResponse: unknown;
  },
  segments: Array<{
    sequence: number;
    startMs: number;
    endMs: number;
    speaker: string | null;
    text: string;
  }>,
) {
  const extras = readTranscriptExtras(transcript.rawResponse);
  const inferredSpeakers = new Set(
    segments.map((segment) => segment.speaker).filter((speaker): speaker is string => Boolean(speaker)),
  );
  const speakers = extras.speakerCount ?? inferredSpeakers.size;

  return {
    id: transcript.id,
    language: transcript.language,
    text: transcript.text ?? '',
    words: extras.words.map((word) => ({
      word: word.word,
      start: msToSeconds(word.startMs),
      end: msToSeconds(word.endMs),
      ...(word.speaker ? { speaker: word.speaker } : {}),
    })),
    ...(extras.formats ? { formats: extras.formats } : {}),
    segments: segments.map((segment) => ({
      id: segment.sequence,
      start: msToSeconds(segment.startMs),
      end: msToSeconds(segment.endMs),
      text: segment.text,
      ...(segment.speaker ? { speaker: segment.speaker } : {}),
    })),
    speakers,
    audio_seconds: transcript.durationMs === null ? null : msToSeconds(transcript.durationMs),
  };
}

@Injectable()
export class RecordingsService {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly projects: ProjectRepository,
    private readonly jobs: JobRepository,
    private readonly jobSteps: JobStepRepository,
    private readonly jobAuditLogs: JobAuditLogRepository,
    private readonly transcripts: TranscriptRepository,
    private readonly segments: TranscriptSegmentRepository,
    private readonly summaries: SummaryRepository,
    private readonly hooks: HookRepository,
    @Inject(QUEUE_PROVIDER) private readonly queue: QueueProvider,
  ) {}

  async create(body: CreateRecordingRequest, userId: number) {
    let storageKey: string;
    try {
      storageKey = parseFilestackRef(body.url).url;
    } catch {
      throw new HttpError(400, 'Invalid url');
    }

    const project = await this.projects.save(
      this.projects.create({
        userId,
        name: body.title,
      }),
    );

    const recording = await this.recordings.save(
      this.recordings.create({
        projectId: project.id,
        title: body.title,
        originalFilename: body.originalFilename,
        storageKey,
        audioStorageKey: null,
        durationMs: null,
        width: null,
        height: null,
        status: RecordingStatus.Processing,
      }),
    );

    const job = await this.jobs.save(
      this.jobs.create({
        type: JobType.VideoIngest,
        recordingId: recording.id,
        status: JobStatus.Queued,
        attempt: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        error: null,
        errorCode: null,
        errorMetadata: null,
        currentStep: null,
        startedAt: null,
        finishedAt: null,
        metadata: null,
      }),
    );

    await this.jobSteps.save(
      JOB_STEP_NAMES.map((step) =>
        this.jobSteps.create({
          jobId: job.id,
          step,
          status: JobStepStatus.Pending,
          attempt: 0,
          maxAttempts: DEFAULT_MAX_ATTEMPTS,
          provider: null,
          providerJobId: null,
          idempotencyKey: `${String(recording.id)}:${String(job.id)}:${step}`,
          result: null,
          error: null,
          startedAt: null,
          completedAt: null,
        }),
      ),
    );

    await this.jobAuditLogs.save(
      this.jobAuditLogs.create({
        jobId: job.id,
        step: null,
        event: 'job_queued',
        message: 'VIDEO_INGEST enqueued',
        metadata: null,
      }),
    );

    await this.queue.enqueue({
      id: `ingest-${String(job.id)}`,
      name: 'ingest-video',
      payload: { recordingId: recording.id, jobId: job.id },
      maxAttempts: 3,
    });

    return { id: recording.id, projectId: project.id, jobId: job.id };
  }

  async list(userId: number) {
    const recordings = await this.recordings.listForUser(userId);
    return recordings.map(toPublicRecording);
  }

  async getById(id: number, userId: number) {
    const recording = await this.recordings.findByIdForUser(id, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    return toPublicRecording(recording);
  }

  async getProcessing(id: number, userId: number) {
    const recording = await this.recordings.findByIdForUser(id, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }

    const job = await this.jobs.findLatestByRecordingAndType(id, JobType.VideoIngest);
    const steps = job ? await this.jobSteps.listByJobId(job.id) : [];
    const audit = job ? await this.jobAuditLogs.listByJobId(job.id) : [];
    const transcript = await this.transcripts.findByRecordingId(id);
    const segments = transcript ? await this.segments.listByRecordingId(id) : [];
    const summary = await this.summaries.findByRecordingId(id);
    const hooks = await this.hooks.listByRecordingId(id);

    return {
      recordingId: recording.id,
      status: recording.status,
      videoUrl: recording.storageKey,
      audioUrl: recording.audioStorageKey,
      job: job
        ? {
            id: job.id,
            status: job.status,
            currentStep: job.currentStep,
            attempt: job.attempt,
            maxAttempts: job.maxAttempts,
            errorCode: job.errorCode,
            errorMessage: job.error,
          }
        : null,
      steps: steps.map((step) => ({
        step: step.step,
        status: step.status,
        attempt: step.attempt,
        ...(step.provider ? { provider: step.provider } : {}),
      })),
      transcript: transcript ? toPublicTranscript(transcript, segments) : null,
      summary: summary ? { id: summary.id, text: summary.text } : null,
      actionItems: summary?.actionItems ?? [],
      hooks: hooks.map((hook) => ({
        id: hook.id,
        title: hook.title,
        hook: hook.hook,
        reason: hook.reason,
        startMs: hook.startMs,
        endMs: hook.endMs,
        score: hook.score,
      })),
      audit: audit.map((row) => ({
        event: row.event,
        step: row.step,
        message: row.message,
        createdAt: row.createdAt,
      })),
    };
  }

  async remove(id: number, userId: number): Promise<void> {
    const recording = await this.recordings.findByIdForUser(id, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    await this.recordings.remove(recording);
  }

  async addToGlobalKnowledgeBase(_id: number, _userId: number): Promise<never> {
    throw new HttpError(501, 'recordingsService.addToGlobalKnowledgeBase is not implemented');
  }
}
