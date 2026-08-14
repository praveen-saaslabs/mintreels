import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as argon2 from 'argon2';
import {
  Clip,
  createDataSource,
  Hook,
  Job,
  JobStep,
  Project,
  Recording,
  Summary,
  Transcript,
  TranscriptSegment,
  User,
} from '@mintreels/db';
import {
  JobStepName,
  type ClipFitMode,
  type ClipRatio,
  type ClipStatus,
  type ClipVoiceover,
  type EmbeddingStatus,
  type HookStatus,
  type HookType,
  type JobStatus,
  type JobStepStatus,
  type JobType,
  type RecordingStatus,
} from '@mintreels/schema';
import type { EntityManager } from 'typeorm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const fixturePath = join(root, 'fixtures', 'demo-seed.json');
const defaultDemoEmail = 'demo@mintreels.local';

interface SeedSegment {
  sequence: number;
  startMs: number;
  endMs: number;
  speaker: string | null;
  text: string;
}

interface SeedHook {
  title: string;
  hook: string;
  reason: string;
  startMs: number;
  endMs: number;
  score: number | null;
  startSequence: number;
  endSequence: number;
  hookType: HookType | null;
  contextText: string | null;
  qualityScore: number | null;
  standaloneScore: number | null;
  curiosityScore: number | null;
  emotionalScore: number | null;
  specificityScore: number | null;
  shareabilityScore: number | null;
  noveltyScore: number | null;
  controversyScore: number | null;
  headlineScore: number | null;
  status: HookStatus;
  embeddingStatus: EmbeddingStatus;
  clipStartMs: number | null;
  clipEndMs: number | null;
  provider: string | null;
  model: string | null;
  promptVersion: string | null;
}

interface SeedClip {
  hookTitle: string;
  title: string;
  socialTitle: string | null;
  socialDescription: string | null;
  startMs: number;
  endMs: number;
  aspectRatio: ClipRatio;
  fitMode: ClipFitMode;
  burnSubtitles: boolean;
  subtitleStyle: string | null;
  storageKey: string | null;
  thumbnailStorageKey: string | null;
  voiceover: ClipVoiceover | null;
  status: ClipStatus;
}

interface SeedJobStep {
  step: JobStepName;
  status: JobStepStatus;
  attempt: number;
  maxAttempts: number;
  provider: string | null;
  providerJobId: string | null;
  result: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
}

interface DemoSeed {
  project: { name: string };
  recording: {
    title: string;
    originalFilename: string;
    storageKey: string;
    audioStorageKey: string | null;
    thumbnailStorageKey: string | null;
    durationMs: number | null;
    status: RecordingStatus;
  };
  transcript: {
    language: string | null;
    provider: string | null;
    providerJobId: string | null;
    status: string | null;
    text: string | null;
    durationMs: number | null;
  };
  segments: SeedSegment[];
  summary: {
    text: string;
    actionItems: Array<{ text: string; startMs?: number; endMs?: number }> | null;
    keyPoints: string[] | null;
  };
  hooks: SeedHook[];
  clips: SeedClip[];
  ingestJob: {
    type: JobType;
    status: JobStatus;
    attempt: number;
    maxAttempts: number;
    currentStep: string | null;
    steps: SeedJobStep[];
  };
  clipJobs: Array<{
    clipTitle: string;
    type: JobType;
    status: JobStatus;
    attempt: number;
    maxAttempts: number;
    metadata: Record<string, unknown>;
  }>;
}

function loadDotEnv(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }
  const text = readFileSync(filePath, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Copy .env.example to .env and set it (value is not printed).`);
  }
  return value;
}

function loadFixture(): DemoSeed {
  if (!existsSync(fixturePath)) {
    throw new Error(`Seed fixture missing: ${fixturePath}`);
  }
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as DemoSeed;
}

async function ensureDemoUser(manager: EntityManager): Promise<User> {
  const email = process.env.SEED_DEMO_EMAIL?.trim() || defaultDemoEmail;
  const existing = await manager.findOne(User, { where: { email } });
  if (existing) {
    return existing;
  }

  const password = process.env.SEED_DEMO_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      'SEED_DEMO_PASSWORD is required to create the demo user. Set it in .env (hashed at seed time; never committed).',
    );
  }

  const user = manager.create(User, {
    email,
    name: 'Demo',
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
    emailVerified: true,
    emailVerificationCodeHash: null,
    emailVerificationExpiresAt: null,
  });
  return manager.save(user);
}

async function attachProjectOwner(manager: EntityManager, projectId: number, userId: number): Promise<void> {
  await manager.update(Project, projectId, { userId, guestId: null });
}

function remapStepResult(
  step: JobStepName,
  result: Record<string, unknown> | null,
  ids: { transcriptId: number; summaryId: number },
): Record<string, unknown> | null {
  if (result === null) {
    return null;
  }
  if (step === JobStepName.TranscriptionPersist) {
    return { transcriptId: ids.transcriptId };
  }
  if (step === JobStepName.Summary) {
    return { summaryId: ids.summaryId };
  }
  if (step === JobStepName.ActionItems) {
    return { ...result, summaryId: ids.summaryId };
  }
  return result;
}

async function insertDemoRecording(
  manager: EntityManager,
  seed: DemoSeed,
  user: User,
): Promise<{ recordingId: number; projectId: number }> {
  const project = await manager.save(
    manager.create(Project, {
      name: seed.project.name,
      userId: user.id,
      guestId: null,
    }),
  );

  const recording = await manager.save(
    manager.create(Recording, {
      projectId: project.id,
      title: seed.recording.title,
      originalFilename: seed.recording.originalFilename,
      storageKey: seed.recording.storageKey,
      audioStorageKey: seed.recording.audioStorageKey,
      thumbnailStorageKey: seed.recording.thumbnailStorageKey,
      durationMs: seed.recording.durationMs,
      status: seed.recording.status,
    }),
  );

  const transcript = await manager.save(
    manager.create(Transcript, {
      recordingId: recording.id,
      language: seed.transcript.language,
      provider: seed.transcript.provider,
      providerJobId: seed.transcript.providerJobId,
      status: seed.transcript.status,
      text: seed.transcript.text,
      durationMs: seed.transcript.durationMs,
      rawResponse: null,
    }),
  );

  const segments = await manager.save(
    seed.segments.map((segment) =>
      manager.create(TranscriptSegment, {
        recordingId: recording.id,
        sequence: segment.sequence,
        startMs: segment.startMs,
        endMs: segment.endMs,
        speaker: segment.speaker,
        text: segment.text,
      }),
    ),
  );
  const segmentIdBySequence = new Map(segments.map((segment) => [segment.sequence, segment.id]));

  const summary = await manager.save(
    manager.create(Summary, {
      recordingId: recording.id,
      text: seed.summary.text,
      actionItems: seed.summary.actionItems,
      keyPoints: seed.summary.keyPoints,
    }),
  );

  const hooks = await manager.save(
    seed.hooks.map((hook) => {
      const startSegmentId = segmentIdBySequence.get(hook.startSequence) ?? null;
      const endSegmentId = segmentIdBySequence.get(hook.endSequence) ?? null;
      return manager.create(Hook, {
        recordingId: recording.id,
        title: hook.title,
        hook: hook.hook,
        reason: hook.reason,
        startMs: hook.startMs,
        endMs: hook.endMs,
        score: hook.score,
        startSegmentId,
        endSegmentId,
        hookType: hook.hookType,
        contextText: hook.contextText,
        qualityScore: hook.qualityScore,
        standaloneScore: hook.standaloneScore,
        curiosityScore: hook.curiosityScore,
        emotionalScore: hook.emotionalScore,
        specificityScore: hook.specificityScore,
        shareabilityScore: hook.shareabilityScore,
        noveltyScore: hook.noveltyScore,
        controversyScore: hook.controversyScore,
        headlineScore: hook.headlineScore,
        status: hook.status,
        embeddingStatus: hook.embeddingStatus,
        clipStartMs: hook.clipStartMs,
        clipEndMs: hook.clipEndMs,
        provider: hook.provider,
        model: hook.model,
        promptVersion: hook.promptVersion,
      });
    }),
  );
  const hookIdByTitle = new Map(hooks.map((hook) => [hook.title, hook.id]));

  const clips = await manager.save(
    seed.clips.map((clip) =>
      manager.create(Clip, {
        recordingId: recording.id,
        hookId: hookIdByTitle.get(clip.hookTitle) ?? null,
        title: clip.title,
        socialTitle: clip.socialTitle,
        socialDescription: clip.socialDescription,
        startMs: clip.startMs,
        endMs: clip.endMs,
        aspectRatio: clip.aspectRatio,
        fitMode: clip.fitMode,
        burnSubtitles: clip.burnSubtitles,
        subtitleStyle: clip.subtitleStyle,
        storageKey: clip.storageKey,
        thumbnailStorageKey: clip.thumbnailStorageKey,
        voiceover: clip.voiceover,
        status: clip.status,
      }),
    ),
  );
  const clipIdByTitle = new Map(clips.map((clip) => [clip.title, clip.id]));

  const now = new Date();
  const ingestJob = await manager.save(
    manager.create(Job, {
      type: seed.ingestJob.type,
      recordingId: recording.id,
      status: seed.ingestJob.status,
      attempt: seed.ingestJob.attempt,
      maxAttempts: seed.ingestJob.maxAttempts,
      error: null,
      errorCode: null,
      errorMetadata: null,
      currentStep: seed.ingestJob.currentStep,
      startedAt: now,
      finishedAt: now,
      metadata: null,
    }),
  );

  await manager.save(
    seed.ingestJob.steps.map((step) =>
      manager.create(JobStep, {
        jobId: ingestJob.id,
        step: step.step,
        status: step.status,
        attempt: step.attempt,
        maxAttempts: step.maxAttempts,
        provider: step.provider,
        providerJobId: step.providerJobId,
        idempotencyKey: `${recording.id}:${ingestJob.id}:${step.step}`,
        result: remapStepResult(step.step, step.result, {
          transcriptId: transcript.id,
          summaryId: summary.id,
        }),
        error: step.error,
        startedAt: now,
        completedAt: now,
      }),
    ),
  );

  await manager.save(
    seed.clipJobs.map((clipJob) => {
      const clipId = clipIdByTitle.get(clipJob.clipTitle);
      return manager.create(Job, {
        type: clipJob.type,
        recordingId: recording.id,
        status: clipJob.status,
        attempt: clipJob.attempt,
        maxAttempts: clipJob.maxAttempts,
        error: null,
        errorCode: null,
        errorMetadata: null,
        currentStep: null,
        startedAt: now,
        finishedAt: now,
        metadata: clipId === undefined ? clipJob.metadata : { ...clipJob.metadata, clipId },
      });
    }),
  );

  return { recordingId: recording.id, projectId: project.id };
}

async function seed(): Promise<void> {
  loadDotEnv(join(root, '.env'));
  requireEnv('DATABASE_URL');
  const seedData = loadFixture();
  const dataSource = createDataSource();
  await dataSource.initialize();

  try {
    const result = await dataSource.transaction(async (manager) => {
      const user = await ensureDemoUser(manager);
      const existing = await manager.findOne(Recording, {
        where: { storageKey: seedData.recording.storageKey },
      });
      if (existing) {
        await attachProjectOwner(manager, existing.projectId, user.id);
        return {
          created: false,
          recordingId: existing.id,
          projectId: existing.projectId,
          email: user.email,
        };
      }
      const inserted = await insertDemoRecording(manager, seedData, user);
      return {
        created: true,
        recordingId: inserted.recordingId,
        projectId: inserted.projectId,
        email: user.email,
      };
    });

    if (result.created) {
      console.log(
        `Seeded demo recording ${result.recordingId} (project ${result.projectId}) for ${result.email}.`,
      );
    } else {
      console.log(
        `Demo recording ${result.recordingId} already present; attached project ${result.projectId} to ${result.email}.`,
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

void seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
