import { GuestSessionStatus, EnvKey } from '@mintreels/schema';
import type { VectorStoreProvider } from '@mintreels/ai';
import { In } from '@mintreels/db';
import type {
  ClipRepository,
  GuestSessionRepository,
  HookRepository,
  JobAuditLogRepository,
  JobRepository,
  JobStepRepository,
  KnowledgeBaseRepository,
  KnowledgeDocumentRepository,
  ProjectRepository,
  RecordingRepository,
  SummaryRepository,
  TranscriptRepository,
  TranscriptSegmentRepository,
} from '@mintreels/db';

/** Repositories/providers the guest cleanup task needs. */
export interface GuestCleanupDeps {
  guestSessions: GuestSessionRepository;
  projects: ProjectRepository;
  recordings: RecordingRepository;
  clips: ClipRepository;
  hooks: HookRepository;
  jobs: JobRepository;
  jobSteps: JobStepRepository;
  jobAuditLogs: JobAuditLogRepository;
  transcripts: TranscriptRepository;
  segments: TranscriptSegmentRepository;
  summaries: SummaryRepository;
  knowledgeBases: KnowledgeBaseRepository;
  knowledgeDocuments: KnowledgeDocumentRepository;
  vectorStore: VectorStoreProvider;
  transcriptVectorStore: VectorStoreProvider;
}

export interface GuestCleanupConfig {
  /** Guest DATA retention window past a session's expiry, in seconds. */
  dataRetentionSeconds: number;
  /** How often the cleanup pass runs, in milliseconds. */
  intervalMs: number;
}

// Defaults mirror apps/api guest.config.ts (the worker cannot import it).
const DEFAULT_DATA_RETENTION_SECONDS = 259_200; // 72h
const DEFAULT_INTERVAL_MS = 3_600_000; // hourly

/** Positive-int env parser, matching the worker's config conventions. */
function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.trunc(parsed);
}

export function loadGuestCleanupConfig(): GuestCleanupConfig {
  return {
    dataRetentionSeconds: parsePositiveInt(
      process.env[EnvKey.GuestDataRetentionSeconds],
      DEFAULT_DATA_RETENTION_SECONDS,
    ),
    intervalMs: parsePositiveInt(process.env.GUEST_CLEANUP_INTERVAL_MS, DEFAULT_INTERVAL_MS),
  };
}

function log(message: string): void {
  console.log(`[guest-cleanup] ${message}`);
}

/**
 * Purge a single recording's dependent rows. Vectors are dropped first so a
 * failure never leaves stale indexes; DB rows are soft-deleted in the same
 * cascade order used by apps/api recordings deletion.
 */
async function purgeRecording(deps: GuestCleanupDeps, recordingId: number): Promise<void> {
  await Promise.all([
    deps.vectorStore.deleteByRecordingId(recordingId),
    deps.transcriptVectorStore.deleteByRecordingId(recordingId),
  ]);

  const jobs = await deps.jobs.find({ where: { recordingId }, select: ['id'] });
  const jobIds = jobs.map((job) => job.id);
  if (jobIds.length > 0) {
    await deps.jobAuditLogs.softDelete({ jobId: In(jobIds) });
    await deps.jobSteps.softDelete({ jobId: In(jobIds) });
  }
  await deps.jobs.softDelete({ recordingId });
  await deps.clips.softDelete({ recordingId });
  await deps.hooks.softDelete({ recordingId });
  await deps.segments.softDelete({ recordingId });
  await deps.transcripts.softDelete({ recordingId });
  await deps.summaries.softDelete({ recordingId });
  await deps.knowledgeDocuments.softDelete({ recordingId });
  await deps.knowledgeBases.softDelete({ recordingId });
  await deps.recordings.softDelete({ id: recordingId });
}

/** Delete all data owned by one guest session, then drop the session row. */
async function purgeSession(
  deps: GuestCleanupDeps,
  session: { id: number; guestId: string },
): Promise<void> {
  // listForOwner excludes soft-deleted rows, so re-runs are idempotent.
  const projects = await deps.projects.listForOwner({ userId: null, guestId: session.guestId });
  const projectIds = projects.map((project) => project.id);

  const recordings = await deps.recordings.listByProjectIds(projectIds);
  for (const recording of recordings) {
    await purgeRecording(deps, recording.id);
  }

  if (projectIds.length > 0) {
    await deps.projects.softDelete({ id: In(projectIds) });
  }

  // The session itself is guest data past retention — drop it so it is not reprocessed.
  await deps.guestSessions.delete({ id: session.id });
}

/** One cleanup pass: expire past-TTL sessions, then purge data past retention. */
export async function runGuestCleanup(
  deps: GuestCleanupDeps,
  config: GuestCleanupConfig,
  now: Date = new Date(),
): Promise<void> {
  // 1. Expire: mark Active sessions whose TTL has passed.
  const expired = await deps.guestSessions.listExpired(now);
  for (const session of expired) {
    try {
      session.status = GuestSessionStatus.Expired;
      await deps.guestSessions.save(session);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`failed to expire session=${String(session.id)}: ${message}`);
    }
  }
  if (expired.length > 0) {
    log(`expired ${String(expired.length)} session(s)`);
  }

  // 2. Purge: delete data for sessions whose TTL passed before the retention cutoff.
  const retentionCutoff = new Date(now.getTime() - config.dataRetentionSeconds * 1000);
  const purgeable = await deps.guestSessions.listPurgeable(retentionCutoff);
  let purged = 0;
  for (const session of purgeable) {
    // Never touch claimed sessions (listPurgeable already excludes them, but be defensive).
    if (session.status === GuestSessionStatus.Claimed) {
      continue;
    }
    try {
      await purgeSession(deps, session);
      purged += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`failed to purge session=${String(session.id)} guest=${session.guestId}: ${message}`);
    }
  }
  if (purged > 0) {
    log(`purged data for ${String(purged)} session(s)`);
  }
}

/**
 * Start the periodic guest cleanup on an interval. Returns a stop handle for
 * graceful shutdown. Runs one pass immediately, then every `intervalMs`.
 */
export function startGuestCleanup(deps: GuestCleanupDeps): { stop: () => void } {
  const config = loadGuestCleanupConfig();

  const tick = (): void => {
    void runGuestCleanup(deps, config).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log(`cleanup pass failed: ${message}`);
    });
  };

  tick();
  const timer = setInterval(tick, config.intervalMs);
  timer.unref?.();
  log(`scheduled every ${String(config.intervalMs)}ms (retention ${String(config.dataRetentionSeconds)}s)`);

  return {
    stop: () => {
      clearInterval(timer);
    },
  };
}
