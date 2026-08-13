import { formatTimestamp } from '@/lib/time';
import type { ClipSummary, ProjectSummary } from './types';

export function formatRelativeUpdatedAt(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return 'Updated recently';
  }

  const deltaMs = Math.max(0, now - then);
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) {
    return 'Updated just now';
  }
  if (minutes < 60) {
    return `Updated ${String(minutes)} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `Updated ${String(hours)} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  return `Updated ${String(days)} day${days === 1 ? '' : 's'} ago`;
}

export function formatProjectJobText(project: ProjectSummary): string {
  switch (project.jobStatus) {
    case 'running':
      return `${String(project.runningJobCount)} job${project.runningJobCount === 1 ? '' : 's'} running`;
    case 'failed':
      return `${String(project.failedJobCount)} job${project.failedJobCount === 1 ? '' : 's'} failed`;
    default:
      return 'idle';
  }
}

export function formatKbLabel(kbScope: ProjectSummary['kbScope']): string {
  if (kbScope === 'global') {
    return 'Global KB · synced';
  }
  if (kbScope === 'recording') {
    return 'Recording KB';
  }
  return 'KB not built';
}

export function formatClipProjectLabel(clip: ClipSummary): string {
  return `${clip.projectName} · ${clip.recordingTitle}`;
}

export function formatClipRange(clip: ClipSummary): string {
  return `${formatTimestamp(clip.startMs / 1000)} – ${formatTimestamp(clip.endMs / 1000)}`;
}

export function formatClipDuration(clip: ClipSummary): string {
  const seconds = Math.max(0, Math.round((clip.endMs - clip.startMs) / 1000));
  return `${String(seconds)}s`;
}

export function formatClipCaption(clip: ClipSummary): string {
  const words = clip.title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 3) {
    return clip.title;
  }
  return words.slice(0, 3).join(' ');
}

export function formatClipFilterLabel(label: string, count: number): string {
  return `${label} · ${String(count)}`;
}

export function isClipSubtitled(clip: ClipSummary): boolean {
  return Boolean(clip.subtitleStyle);
}
