import { Injectable } from '@nestjs/common';
import { ClipRepository, type Clip } from '@mintreels/db';
import {
  CLIP_FILTER_LABELS,
  ClipFilterId,
  ClipRatio,
  ClipStatus,
} from '@mintreels/schema';
import { HttpError, notImplemented } from '../common/http-error';
import type { CreateClipRequest } from './clips.dto';

function clipRatio(width: number | null | undefined, height: number | null | undefined): ClipRatio | undefined {
  if (!width || !height) {
    return undefined;
  }
  if (height > width) {
    return ClipRatio.Vertical;
  }
  if (width === height) {
    return ClipRatio.Square;
  }
  return ClipRatio.Widescreen;
}

function toPublicClip(clip: Clip) {
  const recording = clip.recording;
  const project = recording?.project;
  const ratio = clipRatio(recording?.width, recording?.height);
  return {
    id: clip.id,
    title: clip.title,
    recordingId: clip.recordingId,
    projectId: recording?.projectId ?? project?.id ?? 0,
    projectName: project?.name ?? '',
    recordingTitle: recording?.title ?? '',
    startMs: clip.startMs,
    endMs: clip.endMs,
    status: clip.status,
    subtitleStyle: clip.subtitleStyle,
    ...(ratio ? { ratio } : {}),
  };
}

@Injectable()
export class ClipsService {
  constructor(private readonly clips: ClipRepository) {}

  async create(_body: CreateClipRequest): Promise<never> {
    notImplemented('clipsService.create');
  }

  async list(userId: number) {
    const clips = await this.clips.listForUser(userId);
    return clips.map(toPublicClip);
  }

  async listFilters(userId: number) {
    const clips = await this.clips.listForUser(userId);
    const counts = {
      [ClipFilterId.All]: clips.length,
      [ClipFilterId.Ready]: 0,
      [ClipFilterId.Rendering]: 0,
      [ClipFilterId.Failed]: 0,
      [ClipFilterId.Ratio916]: 0,
      [ClipFilterId.Subtitled]: 0,
    };
    for (const clip of clips) {
      if (clip.status === ClipStatus.Ready) {
        counts[ClipFilterId.Ready] += 1;
      } else if (clip.status === ClipStatus.Rendering) {
        counts[ClipFilterId.Rendering] += 1;
      } else if (clip.status === ClipStatus.Failed) {
        counts[ClipFilterId.Failed] += 1;
      }
      if (clipRatio(clip.recording?.width, clip.recording?.height) === ClipRatio.Vertical) {
        counts[ClipFilterId.Ratio916] += 1;
      }
      if (clip.subtitleStyle) {
        counts[ClipFilterId.Subtitled] += 1;
      }
    }
    return [
      ClipFilterId.All,
      ClipFilterId.Ready,
      ClipFilterId.Rendering,
      ClipFilterId.Failed,
      ClipFilterId.Ratio916,
      ClipFilterId.Subtitled,
    ].map((id) => ({ id, label: CLIP_FILTER_LABELS[id], count: counts[id] }));
  }

  async getById(id: number, userId: number) {
    const clip = await this.clips.findByIdForUser(id, userId);
    if (!clip) {
      throw new HttpError(404, 'Not found');
    }
    return toPublicClip(clip);
  }
}
