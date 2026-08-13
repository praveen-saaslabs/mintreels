import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InMemoryVectorStore, transcriptWindowPointId } from '@mintreels/ai';
import type { TranscriptSegment as SegmentRow } from '@mintreels/db';
import { JobStepName, JobStepStatus } from '@mintreels/schema';
import type { WorkerDeps } from '../deps';
import type { StepRecord } from '../step-runner';
import { transcriptEmbeddingsHandler } from './transcript-embeddings';

const DIMENSIONS = 8;

function segment(overrides: Partial<SegmentRow> & Pick<SegmentRow, 'id' | 'sequence' | 'startMs' | 'endMs' | 'text'>): SegmentRow {
  return {
    recordingId: 42,
    speaker: null,
    ...overrides,
  } as SegmentRow;
}

/** 25s of speech so buildSemanticWindows yields one window. */
function spokenSegments(): SegmentRow[] {
  return [
    segment({ id: 1, sequence: 0, startMs: 0, endMs: 12_000, text: 'We should talk about pricing next quarter.' }),
    segment({ id: 2, sequence: 1, startMs: 12_000, endMs: 25_000, text: 'The enterprise plan starts at ninety nine.' }),
  ];
}

const step: StepRecord = {
  id: 1,
  jobId: 1,
  step: JobStepName.TranscriptEmbeddings,
  status: JobStepStatus.Pending,
  attempt: 0,
  maxAttempts: 4,
  provider: null,
  providerJobId: null,
  idempotencyKey: '1:42:TRANSCRIPT_EMBEDDINGS',
  result: null,
  error: null,
  startedAt: null,
  completedAt: null,
};

function oneHot(axis: number): number[] {
  const vector = new Array<number>(DIMENSIONS).fill(0);
  vector[axis % DIMENSIONS] = 1;
  return vector;
}

function makeDeps(input: {
  segments: SegmentRow[];
  vectorStore: InMemoryVectorStore;
  seen: string[][];
}): WorkerDeps {
  return {
    segments: {
      listByRecordingId: async (recordingId: number) =>
        input.segments.filter((row) => row.recordingId === recordingId),
    },
    embeddings: {
      provider: 'fake',
      model: 'fake-embed',
      dimensions: DIMENSIONS,
      embed: async (texts: string[]) => {
        input.seen.push(texts);
        return texts.map((_, index) => oneHot(index));
      },
    },
    transcriptVectorStore: input.vectorStore,
  } as unknown as WorkerDeps;
}

async function run(deps: WorkerDeps): Promise<Record<string, unknown> | void> {
  return transcriptEmbeddingsHandler(deps)({ jobId: 1, recordingId: 42, step, attempt: 1 });
}

test('embeds semantic windows and upserts recording-scoped vectors', async () => {
  const vectorStore = new InMemoryVectorStore();
  const seen: string[][] = [];
  const result = await run(makeDeps({ segments: spokenSegments(), vectorStore, seen }));

  assert.deepEqual(result, { embedded: 1 });
  assert.equal(seen.length, 1);
  assert.equal(vectorStore.size, 1);

  const windowId = transcriptWindowPointId(42, 0, 25_000);
  const matches = await vectorStore.search(oneHot(0), {
    recordingId: 42,
    limit: 10,
    minimumSimilarity: 0.5,
  });
  assert.equal(matches[0]?.id, windowId);
  assert.equal(matches[0]?.startMs, 0);
  assert.equal(matches[0]?.endMs, 25_000);
});

test('skips embedding when there are no spoken windows', async () => {
  const vectorStore = new InMemoryVectorStore();
  const seen: string[][] = [];
  const result = await run(makeDeps({ segments: [], vectorStore, seen }));

  assert.deepEqual(result, { embedded: 0, skipped: true });
  assert.deepEqual(seen, []);
  assert.equal(vectorStore.size, 0);
});

test('a re-run replaces previous vectors for the recording', async () => {
  const vectorStore = new InMemoryVectorStore();
  const seen: string[][] = [];
  const deps = makeDeps({ segments: spokenSegments(), vectorStore, seen });

  await run(deps);
  await run(deps);
  assert.equal(vectorStore.size, 1);
  assert.equal(seen.length, 2);
});
