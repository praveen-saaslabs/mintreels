import { Injectable } from '@nestjs/common';
import {
  RecordingRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
  type Transcript,
  type TranscriptSegment,
} from '@mintreels/db';
import type { Ownership } from '../auth/auth.types';
import { HttpError } from '../common/http-error';
import { toPublicTranscript } from './public-transcript';

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
  ) {}

  async getByRecordingId(recordingId: number, owner: Ownership) {
    const loaded = await this.loadForOwner(recordingId, owner);
    return toPublicTranscript(loaded, loaded.segments);
  }

  async getVttByRecordingId(recordingId: number, owner: Ownership): Promise<string> {
    const transcript = await this.loadForOwner(recordingId, owner);
    return toWebVtt(transcript);
  }

  private async loadForOwner(recordingId: number, owner: Ownership): Promise<TranscriptWithSegments> {
    const recording = await this.recordings.findByIdForOwner(recordingId, owner);
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
