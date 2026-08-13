import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toPointId } from './qdrant-point-id';
import { transcriptWindowPointId } from '../../transcript-window-id';

test('toPointId accepts unsigned integer hook ids', () => {
  assert.equal(toPointId('42'), 42);
  assert.equal(toPointId('0'), 0);
});

test('toPointId accepts UUID transcript window ids', () => {
  const uuid = transcriptWindowPointId(10, 1000, 25_000);
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(toPointId(uuid), uuid);
  assert.equal(toPointId(uuid.toUpperCase()), uuid);
});

test('toPointId is stable for the same window', () => {
  assert.equal(transcriptWindowPointId(1, 0, 20_000), transcriptWindowPointId(1, 0, 20_000));
  assert.notEqual(transcriptWindowPointId(1, 0, 20_000), transcriptWindowPointId(1, 0, 20_001));
});

test('toPointId rejects unsupported ids', () => {
  assert.throws(() => toPointId('hook-1'), /Unsupported vector id/);
  assert.throws(() => toPointId('-3'), /Unsupported vector id/);
  assert.throws(() => toPointId('not-a-uuid'), /Unsupported vector id/);
});
