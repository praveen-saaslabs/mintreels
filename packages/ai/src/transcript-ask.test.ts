import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Transcript } from '@mintreels/domain';
import {
  classifyTranscriptAsk,
  extractiveAnswer,
  heuristicTranscriptAsk,
  parseTranscriptAskResponse,
} from './transcript-ask';

const transcript: Transcript = {
  id: 1,
  recordingId: 10,
  segments: [
    { id: 1, sequence: 0, startMs: 0, endMs: 12_000, text: 'We should talk about pricing next quarter.' },
    { id: 2, sequence: 1, startMs: 12_000, endMs: 25_000, text: 'The enterprise plan starts at ninety nine.' },
  ],
};

test('classifyTranscriptAsk splits question, clip, and other', () => {
  assert.equal(classifyTranscriptAsk('What did they say about pricing?'), 'question');
  assert.equal(classifyTranscriptAsk('clip the part about pricing'), 'clip');
  assert.equal(classifyTranscriptAsk('the pricing discussion'), 'clip');
  assert.equal(classifyTranscriptAsk("what's the weather in Goa"), 'question');
  assert.equal(classifyTranscriptAsk('write me a python script for kubernetes'), 'other');
  assert.equal(classifyTranscriptAsk('hello there'), 'other');
});

test('heuristicTranscriptAsk answers from overlapping transcript terms', () => {
  const asked = heuristicTranscriptAsk(transcript, 'What did they say about pricing?');
  assert.equal(asked.intent, 'question');
  assert.match(asked.text, /pricing/i);

  const clip = heuristicTranscriptAsk(transcript, 'find the part about enterprise plan');
  assert.equal(clip.intent, 'clip');
  assert.equal(clip.clipQuery.length > 0, true);

  const other = heuristicTranscriptAsk(transcript, 'write me a python script for kubernetes please');
  assert.equal(other.intent, 'other');
  assert.match(other.text, /clip|transcript|recording|video/i);
});

test('extractiveAnswer returns a miss when nothing matches', () => {
  assert.match(extractiveAnswer(transcript, 'quantum bananas'), /does not show up/i);
});

test('parseTranscriptAskResponse fills clipQuery from the original question', () => {
  const parsed = parseTranscriptAskResponse(
    { intent: 'clip', text: 'unused', clipQuery: '' },
    'clip the pricing talk',
  );
  assert.equal(parsed.intent, 'clip');
  assert.equal(parsed.clipQuery, 'clip the pricing talk');
});
