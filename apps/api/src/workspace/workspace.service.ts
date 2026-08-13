import { Injectable } from '@nestjs/common';
import { ClipRepository, ProjectRepository, RecordingRepository, UserRepository } from '@mintreels/db';
import { HttpError } from '../common/http-error';

function initialsFrom(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return '?';
  }
  if (trimmed.includes('@')) {
    const local = trimmed.slice(0, trimmed.indexOf('@'));
    return local.slice(0, 2).toUpperCase() || '?';
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) {
    return '?';
  }
  if (!last || parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly users: UserRepository,
    private readonly projects: ProjectRepository,
    private readonly recordings: RecordingRepository,
    private readonly clips: ClipRepository,
  ) {}

  async getUser(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    const displayName = user.name?.trim() || user.email;
    return {
      displayName,
      initials: initialsFrom(displayName),
      subtitle: user.email,
    };
  }

  async getStats(userId: number) {
    const [projectCount, recordingCount, clipCount] = await Promise.all([
      this.projects.count({ where: { userId } }),
      this.recordings.count({ where: { project: { userId } } }),
      this.clips.count({ where: { recording: { project: { userId } } } }),
    ]);
    return { projectCount, recordingCount, clipCount };
  }
}
