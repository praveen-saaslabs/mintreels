import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatTranscriptText,
  parseActionItemsResponse,
  parseSummaryResponse,
} from './parse';

test('parses summary json into a domain Summary', () => {
  const summary = parseSummaryResponse({ text: 'One grounded paragraph about the call.' }, 42);
  assert.equal(summary.id, 0);
  assert.equal(summary.recordingId, 42);
  assert.equal(summary.text, 'One grounded paragraph about the call.');
  assert.ok(summary.createdAt instanceof Date);
});

test('slices action items to 10 and drops null timestamps', () => {
  const items = parseActionItemsResponse({
    items: Array.from({ length: 12 }, (_, index) => ({
      text: `item ${String(index + 1)}`,
      startMs: index === 0 ? 1000 : null,
      endMs: index === 0 ? 2000 : null,
    })),
  });
  assert.equal(items.length, 10);
  assert.equal(items[0]?.text, 'item 1');
  assert.equal(items[0]?.startMs, 1000);
  assert.equal(items[0]?.endMs, 2000);
  assert.equal(items[1]?.startMs, undefined);
  assert.equal(items[9]?.text, 'item 10');
});

test('empty action-item list is valid', () => {
  assert.deepEqual(parseActionItemsResponse({ items: [] }), []);
});

test('empty transcript formats to an empty payload', () => {
  assert.equal(formatTranscriptText({ id: 1, recordingId: 1, segments: [] }), '');
});

test('formats compact segment lines with optional speaker', () => {
  const text = formatTranscriptText({
    id: 1,
    recordingId: 9,
    segments: [
      { id: 1, sequence: 0, startMs: 0, endMs: 1500, speaker: 'A', text: 'Hello' },
      { id: 2, sequence: 1, startMs: 1500, endMs: 3000, text: 'World' },
    ],
  });
  assert.equal(text, '[0.0s-1.5s] A: Hello\n[1.5s-3.0s] World');
});
