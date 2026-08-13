import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAudioFilename, parseFilestackRef } from './filestack-url';

test('parses a CDN URL into a handle', () => {
  const ref = parseFilestackRef('https://cdn.filestackcontent.com/AbCdEfGhIjK');
  assert.equal(ref.handle, 'AbCdEfGhIjK');
  assert.equal(ref.url, 'https://cdn.filestackcontent.com/AbCdEfGhIjK');
});

test('parses a bare handle', () => {
  const ref = parseFilestackRef('AbCdEfGhIjK');
  assert.equal(ref.handle, 'AbCdEfGhIjK');
});

test('rejects non-https and non-filestack hosts', () => {
  assert.throws(() => parseFilestackRef('http://cdn.filestackcontent.com/AbCdEfGhIjK'));
  assert.throws(() => parseFilestackRef('https://evil.example/AbCdEfGhIjK'));
  assert.throws(() => parseFilestackRef('https://cdn.filestackcontent.com/../etc/passwd'));
});

test('detects audio filenames', () => {
  assert.equal(isAudioFilename('call.wav'), true);
  assert.equal(isAudioFilename('ep14.mp4'), false);
});
