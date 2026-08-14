import { Injectable } from '@nestjs/common';
import { ProjectRepository, RecordingRepository } from '@mintreels/db';
import { loadGuestConfig, type GuestConfig } from '../common/guest.config';
import { HttpError } from '../common/http-error';
import type { Ownership } from '../auth/auth.types';

/**
 * Enforces per-guest resource caps (maxProjects / maxRecordings). No-op for
 * authenticated users — only guests are quota-limited. Throws 403
 * GUEST_LIMIT_REACHED when a guest is at or over the configured limit.
 */
@Injectable()
export class GuestQuotaService {
  private readonly config: GuestConfig = loadGuestConfig();

  constructor(
    private readonly projects: ProjectRepository,
    private readonly recordings: RecordingRepository,
  ) {}

  async assertCanCreateProject(owner: Ownership): Promise<void> {
    if (owner.guestId == null) {
      return;
    }
    const existing = await this.projects.listForOwner(owner);
    if (existing.length >= this.config.maxProjects) {
      throw new HttpError(403, 'GUEST_LIMIT_REACHED');
    }
  }

  async assertCanCreateRecording(owner: Ownership): Promise<void> {
    if (owner.guestId == null) {
      return;
    }
    const existing = await this.recordings.listForOwner(owner);
    if (existing.length >= this.config.maxRecordings) {
      throw new HttpError(403, 'GUEST_LIMIT_REACHED');
    }
  }
}
