import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PyAIError } from '@pyai/sdk';
import { mapPyAIError } from './errors';
import { mapJobToSubmission, mapResultToCanonical } from './mapper';

test('maps a valid transcription result to canonical ms segments', () => {
  const canonical = mapResultToCanonical({
    text: 'Hello world',
    audio_seconds: 1.5,
    segments: [
      { id: 's1', start: 0, end: 0.4, text: 'Hello', speaker: 'A' },
      { id: 's2', start: 0.4, end: 1.5, text: 'world', speaker: 'B' },
    ],
  });
  assert.equal(canonical.text, 'Hello world');
  assert.equal(canonical.durationMs, 1500);
  assert.equal(canonical.segments.length, 2);
  assert.equal(canonical.segments[0]?.startMs, 0);
  assert.equal(canonical.segments[0]?.endMs, 400);
  assert.equal(canonical.segments[1]?.startMs, 400);
  assert.equal(canonical.segments[1]?.endMs, 1500);
  assert.equal(canonical.segments[0]?.speaker, 'A');
});

test('empty segments produce an empty canonical transcript', () => {
  const canonical = mapResultToCanonical({ text: '', segments: [] });
  assert.equal(canonical.text, '');
  assert.deepEqual(canonical.segments, []);
});

test('missing optional fields are omitted', () => {
  const canonical = mapResultToCanonical({
    segments: [{ start: 1, end: 2, text: 'Hi' }],
  });
  assert.equal(canonical.segments[0]?.speaker, undefined);
  assert.equal(canonical.durationMs, undefined);
  assert.equal(canonical.text, 'Hi');
});

test('converts seconds to milliseconds', () => {
  const canonical = mapResultToCanonical({
    audio_seconds: 2.25,
    segments: [{ start: 1.001, end: 2.25, text: 'x' }],
  });
  assert.equal(canonical.segments[0]?.startMs, 1001);
  assert.equal(canonical.segments[0]?.endMs, 2250);
  assert.equal(canonical.durationMs, 2250);
});

test('malformed result throws', () => {
  assert.throws(() => mapResultToCanonical(null));
  assert.throws(() => mapResultToCanonical({ segments: 'nope' }));
  assert.throws(() => mapResultToCanonical({ segments: [{ start: '0', end: 1, text: 'x' }] }));
});

test('maps job_id and status to a submission', () => {
  const submission = mapJobToSubmission({
    job_id: 'abc',
    status: 'running',
  });
  assert.equal(submission.providerJobId, 'abc');
  assert.equal(submission.status, 'running');
});

test('429 rate_limit_exceeded is retryable and honors Retry-After', () => {
  const mapped = mapPyAIError(
    new PyAIError(429, 'Retry-After: 7', 'rate_limit_exceeded'),
  );
  assert.equal(mapped.retryable, true);
  assert.equal(mapped.retryAfterMs, 7000);
  assert.equal(mapped.code, 'rate_limit_exceeded');
});

test('5xx is retryable', () => {
  const mapped = mapPyAIError(new PyAIError(503, 'unavailable', 'server_error'));
  assert.equal(mapped.retryable, true);
});

test('unauthorized and credit_exhausted are not retryable', () => {
  assert.equal(mapPyAIError(new PyAIError(401, 'nope', 'unauthorized')).retryable, false);
  assert.equal(mapPyAIError(new PyAIError(402, 'paid', 'credit_exhausted')).retryable, false);
  assert.equal(mapPyAIError(new PyAIError(400, 'bad', 'invalid_request_error')).retryable, false);
});
