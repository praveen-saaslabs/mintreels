export const SOCIAL_COPY_PROMPT_VERSION = 'social-copy-v1';

export const SOCIAL_COPY_TITLE_MAX = 120;
export const SOCIAL_COPY_DESCRIPTION_MAX = 2200;
export const SOCIAL_COPY_EXCERPT_MAX_CHARS = 8000;

export const SOCIAL_COPY_SYSTEM_PROMPT = [
  'You write social media share copy for short video clips. Return JSON only.',
  'Use only the context provided. Never invent quotes, facts, names, or numbers.',
  'title: short punchy share title (about 3–12 words), curiosity-driving, no hashtags, no emoji spam, no ALL CAPS shouting.',
  `title must be at most ${String(SOCIAL_COPY_TITLE_MAX)} characters.`,
  'description: 1–3 sentences summarizing the clip for a feed post, plus a light CTA to watch.',
  'Keep description natural for Instagram / LinkedIn / X — no hashtag walls, no fake urgency.',
  `description must be at most ${String(SOCIAL_COPY_DESCRIPTION_MAX)} characters.`,
  'Do not include URLs in title or description.',
].join(' ');

export const SOCIAL_COPY_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['title', 'description'],
  additionalProperties: false,
};

export type SocialCopyContext = {
  clipTitle: string;
  recordingTitle: string;
  startMs: number;
  endMs: number;
  transcriptExcerpt: string;
  hookTitle?: string | null;
  hookLine?: string | null;
  hookReason?: string | null;
};

export function buildSocialCopyUserPrompt(context: SocialCopyContext): string {
  const excerpt =
    context.transcriptExcerpt.trim().length > 0
      ? context.transcriptExcerpt.trim().slice(0, SOCIAL_COPY_EXCERPT_MAX_CHARS)
      : '(empty excerpt)';
  const lines = [
    `Recording title: ${context.recordingTitle.trim() || '(untitled)'}`,
    `Clip title: ${context.clipTitle.trim() || '(untitled)'}`,
    `Range: ${String(context.startMs)}ms – ${String(context.endMs)}ms`,
  ];
  if (context.hookTitle?.trim()) {
    lines.push(`Hook title: ${context.hookTitle.trim()}`);
  }
  if (context.hookLine?.trim()) {
    lines.push(`Hook line: ${context.hookLine.trim()}`);
  }
  if (context.hookReason?.trim()) {
    lines.push(`Hook reason: ${context.hookReason.trim()}`);
  }
  lines.push('', 'Transcript excerpt:', excerpt);
  return lines.join('\n');
}

export function parseSocialCopyResponse(raw: unknown): { title: string; description: string } {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Social copy response is not an object');
  }
  const record = raw as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const description = typeof record.description === 'string' ? record.description.trim() : '';
  if (!title) {
    throw new Error('Social copy title is empty');
  }
  if (!description) {
    throw new Error('Social copy description is empty');
  }
  return {
    title: title.slice(0, SOCIAL_COPY_TITLE_MAX),
    description: description.slice(0, SOCIAL_COPY_DESCRIPTION_MAX),
  };
}

/** Fallback when the LLM is unavailable (e.g. PyAI stub). */
export function heuristicSocialCopy(context: SocialCopyContext): {
  title: string;
  description: string;
} {
  const titleSource =
    context.hookTitle?.trim() || context.clipTitle.trim() || context.recordingTitle.trim() || 'Clip';
  const title = titleSource.slice(0, SOCIAL_COPY_TITLE_MAX);
  const excerpt = context.transcriptExcerpt.trim().replace(/\s+/g, ' ');
  const reason = context.hookReason?.trim();
  let description = reason || excerpt || 'Watch this clip.';
  if (!reason && excerpt.length > 280) {
    description = `${excerpt.slice(0, 277).trimEnd()}…`;
  }
  if (!description.toLowerCase().includes('watch')) {
    description = `${description} Watch the clip.`;
  }
  return {
    title,
    description: description.slice(0, SOCIAL_COPY_DESCRIPTION_MAX),
  };
}
