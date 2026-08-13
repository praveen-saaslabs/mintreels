import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clipCreateGuard } from './clip-create-guard';

test('create rejects another user recordingId', () => {
  assert.equal(clipCreateGuard(null, 1000, 5000), 'not_found');
});

test('create rejects missing video and inverted ranges', () => {
  assert.equal(clipCreateGuard({ storageKey: '' }, 1000, 5000), 'video_unavailable');
  assert.equal(clipCreateGuard({ storageKey: 'https://cdn.filestackcontent.com/HANDLE' }, 5000, 1000), 'invalid_range');
  assert.equal(clipCreateGuard({ storageKey: 'https://cdn.filestackcontent.com/HANDLE' }, 1000, 5000), 'ok');
});
