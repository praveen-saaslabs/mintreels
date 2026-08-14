import { Inject, Injectable } from '@nestjs/common';
import {
  JobAuditLogRepository,
  JobRepository,
  RecordingRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
  type Transcript,
  type TranscriptSegment,
} from '@mintreels/db';
import { DEFAULT_MAX_ATTEMPTS } from '@mintreels/domain';
import type { QueueProvider } from '@mintreels/queue';
import { JobStatus, JobType } from '@mintreels/schema';
import { HttpError } from '../common/http-error';
import { QUEUE_PROVIDER } from '../providers/provider-tokens';
import { toPublicTranscript } from './public-transcript';
import type { ApplyOverdubRequest, PatchTranscriptSegmentRequest } from './transcripts.dto';

type TranscriptWithSegments = Transcript & { segments: TranscriptSegment[] };

function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0');
}

function formatVttTimestamp(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

function toWebVtt(transcript: TranscriptWithSegments): string {
  if (transcript.segments.length === 0) {
    return 'WEBVTT\n';
  }
  const cues = transcript.segments.map((segment, index) => {
    const voice = segment.speaker ? `<v ${segment.speaker}>` : '';
    return `${String(index + 1)}\n${formatVttTimestamp(segment.startMs)} --> ${formatVttTimestamp(segment.endMs)}\n${voice}${segment.text}`;
  });
  return `WEBVTT\n\n${cues.join('\n\n')}\n`;
}

@Injectable()
export class TranscriptsService {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly transcripts: TranscriptRepository,
    private readonly segments: TranscriptSegmentRepository,
    private readonly jobs: JobRepository,
    private readonly jobAuditLogs: JobAuditLogRepository,
    @Inject(QUEUE_PROVIDER) private readonly queue: QueueProvider,
  ) {}

  async getByRecordingId(recordingId: number, userId: number) {
    const loaded = await this.loadForUser(recordingId, userId);
    return toPublicTranscript(loaded, loaded.segments);
  }

  async getVttByRecordingId(recordingId: number, userId: number): Promise<string> {
    const transcript = await this.loadForUser(recordingId, userId);
    return toWebVtt(transcript);
  }

  async patchSegment(
    recordingId: number,
    segmentSequence: number,
    body: PatchTranscriptSegmentRequest,
    userId: number,
  ) {
    const recording = await this.recordings.findByIdForUser(recordingId, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    const segment = await this.segments.findOne({
      where: { recordingId, sequence: segmentSequence },
    });
    if (!segment) {
      throw new HttpError(404, 'Not found');
    }

    segment.text = body.text;
    await this.segments.save(segment);

    return {
      id: segment.sequence,
      start: segment.startMs / 1000,
      end: segment.endMs / 1000,
      text: segment.text,
      ...(segment.speaker ? { speaker: segment.speaker } : {}),
    };
  }

  async applyOverdub(
    recordingId: number,
    segmentSequence: number,
    body: ApplyOverdubRequest,
    userId: number,
  ) {
    const recording = await this.recordings.findByIdForUser(recordingId, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    if (recording.storageKey.trim() === '') {
      throw new HttpError(409, 'VIDEO_NOT_AVAILABLE');
    }

    const segment = await this.segments.findOne({
      where: { recordingId, sequence: segmentSequence },
    });
    if (!segment) {
      throw new HttpError(404, 'Not found');
    }
    if (segment.startMs >= segment.endMs) {
      throw new HttpError(400, 'INVALID_SEGMENT_RANGE');
    }
    if (segment.text.trim() === '') {
      throw new HttpError(400, 'EMPTY_SEGMENT_TEXT');
    }

    const inFlightOverdub = await this.jobs.findLatestByRecordingAndType(
      recordingId,
      JobType.ApplyOverdub,
    );
    const inFlightVoiceover = await this.jobs.findLatestByRecordingAndType(
      recordingId,
      JobType.ApplyRecordingVoiceover,
    );
    for (const job of [inFlightOverdub, inFlightVoiceover]) {
      if (
        job &&
        (job.status === JobStatus.Queued || job.status === JobStatus.Running)
      ) {
        throw new HttpError(409, 'OVERDUB_IN_PROGRESS');
      }
    }

    const job = await this.jobs.save(
      this.jobs.create({
        type: JobType.ApplyOverdub,
        recordingId,
        status: JobStatus.Queued,
        attempt: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        error: null,
        errorCode: null,
        errorMetadata: null,
        currentStep: null,
        startedAt: null,
        finishedAt: null,
        metadata: {
          segmentId: segment.id,
          segmentSequence: segment.sequence,
          voiceId: body.voiceId,
        },
      }),
    );

    await this.jobAuditLogs.save(
      this.jobAuditLogs.create({
        jobId: job.id,
        step: null,
        event: 'job_queued',
        message: 'APPLY_OVERDUB enqueued',
        metadata: { segmentId: segment.id, segmentSequence: segment.sequence },
      }),
    );

    await this.queue.enqueue({
      id: `apply-overdub-${String(job.id)}`,
      name: 'apply-overdub',
      payload: {
        recordingId,
        segmentId: segment.id,
        jobId: job.id,
        voiceId: body.voiceId,
        text: segment.text,
        startMs: segment.startMs,
        endMs: segment.endMs,
      },
      maxAttempts: 3,
    });

    return {
      jobId: job.id,
      status: job.status,
      segmentId: segment.sequence,
      voiceId: body.voiceId,
    };
  }

  async getOverdubJob(recordingId: number, userId: number) {
    const recording = await this.recordings.findByIdForUser(recordingId, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    const job = await this.jobs.findLatestByRecordingAndType(recordingId, JobType.ApplyOverdub);
    if (!job) {
      return { jobId: null, status: null as string | null, error: null as string | null };
    }
    return {
      jobId: job.id,
      status: job.status,
      error: job.error,
      segmentId:
        typeof job.metadata?.['segmentSequence'] === 'number'
          ? job.metadata['segmentSequence']
          : null,
    };
  }

  private async loadForUser(recordingId: number, userId: number): Promise<TranscriptWithSegments> {
    const recording = await this.recordings.findByIdForUser(recordingId, userId);
    if (!recording) {
      throw new HttpError(404, 'Not found');
    }
    const transcript = await this.transcripts.findByRecordingId(recordingId);
    if (!transcript) {
      throw new HttpError(404, 'Not found');
    }
    const segments = await this.segments.listByRecordingId(recordingId);
    return { ...transcript, segments };
  }
}
