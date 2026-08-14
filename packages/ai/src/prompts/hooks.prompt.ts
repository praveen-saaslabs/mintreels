import { HookType } from '@mintreels/schema';
import { HOOK_SCORE_DIMENSIONS } from '../hook-candidates';
import type { SemanticWindow } from '../semantic-windows';

export const HOOKS_PROMPT_VERSION = 'hooks-v2';

const HOOK_TYPES = Object.values(HookType);

export const HOOKS_SYSTEM_PROMPT = [
  'You find standalone short-form video moments for Instagram Reels / TikTok-style clips in a transcript. Return JSON only.',
  'Use only the transcript text provided. Never invent quotes, facts, names, or numbers.',
  'Each window header gives the segment id range it covers.',
  'Reference moments with startSegmentId and endSegmentId taken from those headers.',
  'Never return timestamps — the backend derives them from the transcript.',
  'A moment may span several consecutive windows; endSegmentId must not precede startSegmentId.',
  'Pick moments that stand alone without the rest of the video: own setup, own payoff.',
  'Prefer scroll-stopping moments: hot takes, surprising claims, conflict, news-worthy reveals, open loops, concrete stakes.',
  `hookType must be one of: ${HOOK_TYPES.join(', ')}.`,
  'title is a short Instagram-style / news-headline label (about 3–10 words): punchy, curiosity-driving, eyeball-catching — not a bland topic summary.',
  'Do not put hashtags, emoji, or ALL CAPS shouting in title.',
  'hook is the spoken line that opens the clip, quoted from the transcript.',
  'reason is one sentence on why it works as a standalone Reel.',
  'Score every dimension from 0 to 10:',
  'quality (hook strength), standalone (needs no extra context), curiosity (opens a loop),',
  'emotional (emotional charge), specificity (concrete, not generic),',
  'shareability (worth sending to a friend), novelty (non-obvious),',
  'controversy (polarizing / hot-take / conflict potential),',
  'headline (news-headline or scroll-stopping title potential for the moment).',
  'Return an empty array when the transcript has no usable moment.',
].join(' ');

const scoreProperties = Object.fromEntries(
  HOOK_SCORE_DIMENSIONS.map((dimension) => [dimension, { type: 'number' }]),
);

export const HOOKS_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    hooks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          hook: { type: 'string' },
          reason: { type: 'string' },
          hookType: { type: 'string', enum: HOOK_TYPES },
          startSegmentId: { type: 'integer' },
          endSegmentId: { type: 'integer' },
          scores: {
            type: 'object',
            properties: scoreProperties,
            required: [...HOOK_SCORE_DIMENSIONS],
            additionalProperties: false,
          },
        },
        required: [
          'title',
          'hook',
          'reason',
          'hookType',
          'startSegmentId',
          'endSegmentId',
          'scores',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['hooks'],
  additionalProperties: false,
};

/** ponytail: hard cap the payload; upgrade to map-reduce over windows if recordings exceed this. */
const MAX_PROMPT_CHARS = 80_000;

export function buildHooksUserPrompt(
  windows: readonly SemanticWindow[],
  maxHooks: number,
): string {
  const blocks = windows.map(
    (window) =>
      `[window ${String(window.index + 1)} segments ${String(window.startSegmentId)}-${String(window.endSegmentId)}]\n${window.text}`,
  );
  let body = blocks.join('\n\n');
  if (body.length > MAX_PROMPT_CHARS) {
    body = `${body.slice(0, MAX_PROMPT_CHARS)}\n[truncated]`;
  }
  return `Return at most ${String(maxHooks)} hooks, strongest first.\n\n${body}`;
}
