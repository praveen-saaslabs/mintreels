import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InMemoryVectorStore } from '@mintreels/ai';
import type { Hook } from '@mintreels/db';
import {
  EmbeddingStatus,
  HookStatus,
  HookType,
  JobStepName,
  JobStepStatus,
} from '@mintreels/schema';
import type { WorkerDeps } from '../deps';
import type { StepRecord } from '../step-runner';
import { hookEmbeddingsHandler } from './hook-embeddings';

const DIMENSIONS = 8;

function makeHook(overrides: Partial<Hook> = {}): Hook {
  return {
    id: 1,
    recordingId: 42,
    title: 'Founder mistake',
    hook: 'The biggest mistake founders make',
    reason: 'Opens a loop',
    startMs: 10_000,
    endMs: 35_000,
    score: 0.8,
    hookType: HookType.Lesson,
    contextText: 'line 3 line 4',
    status: HookStatus.Candidate,
    embeddingStatus: EmbeddingStatus.Pending,
    ...overrides,
  } as Hook;
}

const step: StepRecord = {
  id: 1,
  jobId: 1,
  step: JobStepName.HookEmbeddings,
  status: JobStepStatus.Pending,
  attempt: 0,
  maxAttempts: 4,
  provider: null,
  providerJobId: null,
  idempotencyKey: '1:42:HOOK_EMBEDDINGS',
  result: null,
  error: null,
  startedAt: null,
  completedAt: null,
};

/** One-hot vector so cosine similarity is 1 against itself and 0 against every other text. */
function oneHot(axis: number): number[] {
  const vector = new Array<number>(DIMENSIONS).fill(0);
  vector[axis % DIMENSIONS] = 1;
  return vector;
}

function makeDeps(input: {
  hooks: Hook[];
  vectorStore: InMemoryVectorStore;
  seen: string[][];
  failWith?: Error;
}): WorkerDeps {
  const axes = new Map<string, number>();
  return {
    hooks: {
      listByRecordingId: async (recordingId: number) =>
        input.hooks.filter((hook) => hook.recordingId === recordingId),
      save: async (rows: Hook[]) => rows,
    },
    embeddings: {
      provider: 'fake',
      model: 'fake-embed',
      dimensions: DIMENSIONS,
      embed: async (texts: string[]) => {
        if (input.failWith) {
          throw input.failWith;
        }
        input.seen.push(texts);
        return texts.map((text) => {
          const axis = axes.get(text) ?? axes.size;
          axes.set(text, axis);
          return oneHot(axis);
        });
      },
    },
    vectorStore: input.vectorStore,
  } as unknown as WorkerDeps;
}

async function run(deps: WorkerDeps): Promise<Record<string, unknown> | void> {
  return hookEmbeddingsHandler(deps)({ jobId: 1, recordingId: 42, step, attempt: 1 });
}

test('embeds pending hooks, upserts recording-scoped vectors, and completes them', async () => {
  const hooks = [
    makeHook({ id: 1 }),
    makeHook({ id: 2, hook: 'Second hook', contextText: null }),
    makeHook({ id: 9, recordingId: 99, hook: 'Other recording' }),
  ];
  const vectorStore = new InMemoryVectorStore();
  const seen: string[][] = [];

  const result = await run(makeDeps({ hooks, vectorStore, seen }));

  assert.deepEqual(result, { embedded: 2, skipped: 0 });
  assert.deepEqual(seen, [['The biggest mistake founders make line 3 line 4', 'Second hook']]);
  assert.equal(vectorStore.size, 2);
  assert.deepEqual(
    hooks.map((hook) => hook.embeddingStatus),
    [EmbeddingStatus.Completed, EmbeddingStatus.Completed, EmbeddingStatus.Pending],
  );

  const matches = await vectorStore.search(oneHot(0), {
    recordingId: 42,
    limit: 10,
    minimumSimilarity: 0.5,
  });
  assert.deepEqual(
    matches.map((match) => match.id),
    ['1'],
  );
  assert.equal(matches[0]?.startMs, 10_000);
  assert.equal(matches[0]?.endMs, 35_000);
  assert.equal(matches[0]?.hookType, HookType.Lesson);

  // Vectors from another recording are never returned, even at zero similarity.
  const crossRecording = await vectorStore.search(oneHot(0), {
    recordingId: 99,
    limit: 10,
    minimumSimilarity: 0,
  });
  assert.deepEqual(crossRecording, []);
});

test('a re-run skips completed hooks and re-upserts the same vector ids', async () => {
  const hooks = [makeHook({ id: 1 }), makeHook({ id: 2, hook: 'Second hook', contextText: null })];
  const vectorStore = new InMemoryVectorStore();
  const seen: string[][] = [];

  await run(makeDeps({ hooks, vectorStore, seen }));
  assert.deepEqual(await run(makeDeps({ hooks, vectorStore, seen })), { embedded: 0, skipped: 2 });
  assert.equal(seen.length, 1);

  const failed = hooks[0];
  assert.ok(failed);
  failed.embeddingStatus = EmbeddingStatus.Failed;
  assert.deepEqual(await run(makeDeps({ hooks, vectorStore, seen })), { embedded: 1, skipped: 1 });
  assert.equal(vectorStore.size, 2);
  assert.equal(failed.embeddingStatus, EmbeddingStatus.Completed);
});

test('a provider failure marks the pending hooks failed and rethrows', async () => {
  const hooks = [makeHook({ id: 1 })];
  const vectorStore = new InMemoryVectorStore();

  await assert.rejects(
    run(
      makeDeps({
        hooks,
        vectorStore,
        seen: [],
        failWith: new Error('embedding api down'),
      }),
    ),
    /embedding api down/,
  );
  assert.equal(hooks[0]?.embeddingStatus, EmbeddingStatus.Failed);
  assert.equal(vectorStore.size, 0);
});
