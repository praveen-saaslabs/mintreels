import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InMemoryVectorStore, transcriptWindowPointId } from '@mintreels/ai';
import { JobStepStatus } from '@mintreels/schema';
import { isTranscriptIndexReady, toMomentCandidates } from './moment-results';

const DIMENSIONS = 8;

function oneHot(axis: number): number[] {
  const vector = new Array<number>(DIMENSIONS).fill(0);
  vector[axis % DIMENSIONS] = 1;
  return vector;
}

const segments = [
  { startMs: 0, endMs: 12_000, text: 'We should talk about pricing next quarter.' },
  { startMs: 12_000, endMs: 25_000, text: 'The enterprise plan starts at ninety nine.' },
];

test('search returns ranked hydrated moments with padded clip bounds', async () => {
  const vectorStore = new InMemoryVectorStore();
  await vectorStore.upsert([
    {
      id: transcriptWindowPointId(10, 0, 25_000),
      vector: oneHot(0),
      recordingId: 10,
      startMs: 0,
      endMs: 25_000,
    },
  ]);

  const embeddings = {
    embed: async (_texts: string[]) => [oneHot(0)],
  };
  const [queryVector] = await embeddings.embed(['pricing discussion']);
  assert.ok(queryVector);
  const hits = await vectorStore.search(queryVector, {
    recordingId: 10,
    limit: 8,
    minimumSimilarity: 0.35,
  });
  const moments = toMomentCandidates(hits, segments, {
    preRollMs: 3000,
    postRollMs: 5000,
    recordingDurationMs: 120_000,
  });

  assert.equal(moments.length, 1);
  assert.equal(moments[0]?.startMs, 0);
  assert.equal(moments[0]?.endMs, 25_000);
  assert.equal(moments[0]?.clipStartMs, 0);
  assert.equal(moments[0]?.clipEndMs, 30_000);
  assert.equal(moments[0]?.title, 'We should talk about pricing next quarter. The');
  assert.match(moments[0]?.excerpt ?? '', /pricing/);
  assert.ok((moments[0]?.similarity ?? 0) >= 0.99);
});

test('empty transcript index is not ready', () => {
  assert.equal(isTranscriptIndexReady(undefined), false);
  assert.equal(isTranscriptIndexReady(JobStepStatus.Pending), false);
  assert.equal(isTranscriptIndexReady(JobStepStatus.Failed), false);
  assert.equal(isTranscriptIndexReady(JobStepStatus.Completed), true);
  assert.equal(isTranscriptIndexReady(JobStepStatus.Skipped), true);
});
