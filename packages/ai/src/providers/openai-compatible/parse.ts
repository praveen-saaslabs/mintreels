import type { Summary, Transcript } from '@mintreels/domain';
import { actionItemSchema } from '@mintreels/schema';
import { z } from 'zod';
import type { ActionItem } from '../../llm-provider';

export const SUMMARY_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    text: { type: 'string' },
  },
  required: ['text'],
  additionalProperties: false,
};

export const ACTION_ITEMS_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          startMs: { type: ['integer', 'null'] },
          endMs: { type: ['integer', 'null'] },
        },
        required: ['text', 'startMs', 'endMs'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const summaryLlmSchema = z.object({
  text: z.string().min(1),
});

const actionItemsLlmSchema = z.object({
  items: z.array(actionItemSchema),
});

/** ponytail: hard cap transcript payload; upgrade to map-reduce if recordings exceed this. */
const MAX_TRANSCRIPT_SEGMENTS = 800;
const MAX_TRANSCRIPT_CHARS = 80_000;

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatTranscriptText(transcript: Transcript): string {
  const lines = transcript.segments.slice(0, MAX_TRANSCRIPT_SEGMENTS).map((segment) => {
    const speaker = segment.speaker ? ` ${segment.speaker}:` : '';
    return `[${formatMs(segment.startMs)}-${formatMs(segment.endMs)}]${speaker} ${segment.text.trim()}`;
  });
  let text = lines.join('\n');
  if (text.length > MAX_TRANSCRIPT_CHARS) {
    text = `${text.slice(0, MAX_TRANSCRIPT_CHARS)}\n[truncated]`;
  }
  return text;
}

function omitNullTimestamps(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) {
    return raw;
  }
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    return raw;
  }
  return {
    ...raw,
    items: items.map((item) => {
      if (typeof item !== 'object' || item === null) {
        return item;
      }
      const rec = item as { text?: unknown; startMs?: unknown; endMs?: unknown };
      const next: { text?: unknown; startMs?: unknown; endMs?: unknown } = { text: rec.text };
      if (typeof rec.startMs === 'number') next.startMs = rec.startMs;
      if (typeof rec.endMs === 'number') next.endMs = rec.endMs;
      return next;
    }),
  };
}

export function parseSummaryResponse(raw: unknown, recordingId: number): Summary {
  const parsed = summaryLlmSchema.parse(raw);
  return {
    id: 0,
    recordingId,
    text: parsed.text,
    createdAt: new Date(),
  };
}

export function parseActionItemsResponse(raw: unknown): ActionItem[] {
  const parsed = actionItemsLlmSchema.parse(omitNullTimestamps(raw));
  return parsed.items.slice(0, 10).map((item) => {
    const mapped: ActionItem = { text: item.text };
    if (item.startMs !== undefined) mapped.startMs = item.startMs;
    if (item.endMs !== undefined) mapped.endMs = item.endMs;
    return mapped;
  });
}
