import type { Transcript } from '@mintreels/domain';
import { z } from 'zod';

export const TRANSCRIPT_ASK_INTENTS = ['question', 'clip', 'other'] as const;
export type TranscriptAskIntent = (typeof TRANSCRIPT_ASK_INTENTS)[number];

export type TranscriptAskResult = {
  intent: TranscriptAskIntent;
  /** Grounded answer (question) or funny refusal (other). Empty for clip. */
  text: string;
  /** Phrase to embed for clip search. Empty unless intent is clip. */
  clipQuery: string;
};

const CLIP_CUE =
  /\b(clip|cut(?:\s+me)?|find(?:\s+me)?(?:\s+the)?\s+(?:part|moment|bit|clip)|show(?:\s+me)?(?:\s+the)?\s+(?:part|moment|clip)|jump\s+to|time\s*stamp|where\s+(?:they|he|she)\s+(?:talk|said|mention)|make\s+a\s+clip)\b/i;
const CLIP_OPENER = /^(?:the\s+)?(?:part|moment|bit|section)\b/i;
const QUESTION_CUE =
  /^(what|why|who|how|when|where|did|does|do|is|are|was|were|can|could|would|explain|summarize|tell\s+me)\b/i;
const SMALLTALK = /^(hi|hey|hello|thanks|thank\s+you|ok|okay|lol|yo)\b/i;

export const TRANSCRIPT_ASK_REJECTS = [
  "Cute question, but I'm on clip duty. Ask what they said in this video, or ask me to find a moment.",
  "I don't do weather, recipes, or existential dread — only this recording.",
  'Wrong window. This booth only answers the transcript or fetches a clip.',
  'Not ChatGPT-at-large. Try "what did they say about X" or "clip the part about X".',
] as const;

export function funnyReject(query: string): string {
  let hash = 0;
  for (const char of query) {
    hash = (hash + char.charCodeAt(0)) % TRANSCRIPT_ASK_REJECTS.length;
  }
  return TRANSCRIPT_ASK_REJECTS[hash] ?? TRANSCRIPT_ASK_REJECTS[0];
}

/** Cheap intent guess when the chat LLM is unavailable. */
export function classifyTranscriptAsk(query: string): TranscriptAskIntent {
  const trimmed = query.trim();
  if (CLIP_CUE.test(trimmed) || CLIP_OPENER.test(trimmed)) {
    return 'clip';
  }
  if (/[?]/.test(trimmed) || QUESTION_CUE.test(trimmed)) {
    return 'question';
  }
  const words = trimmed.split(/\s+/).filter((word) => word.length > 0);
  if (words.length > 0 && words.length <= 6 && !SMALLTALK.test(trimmed)) {
    return 'clip';
  }
  return 'other';
}

export function extractiveAnswer(transcript: Transcript, question: string): string {
  const terms = question
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3);
  if (terms.length === 0) {
    return 'Nothing in this transcript matches that.';
  }
  const ranked = transcript.segments
    .map((segment) => {
      const text = segment.text.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
      return { text: segment.text.trim(), score };
    })
    .filter((row) => row.score > 0 && row.text.length > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
  if (ranked.length === 0) {
    return 'That does not show up in this transcript.';
  }
  return ranked.map((row) => row.text).join(' ');
}

export function heuristicTranscriptAsk(transcript: Transcript, question: string): TranscriptAskResult {
  const intent = classifyTranscriptAsk(question);
  if (intent === 'clip') {
    return { intent, text: '', clipQuery: question.trim() };
  }
  if (intent === 'other') {
    return { intent, text: funnyReject(question), clipQuery: '' };
  }
  return { intent: 'question', text: extractiveAnswer(transcript, question), clipQuery: '' };
}

const askLlmSchema = z.object({
  intent: z.enum(TRANSCRIPT_ASK_INTENTS),
  text: z.string(),
  clipQuery: z.string(),
});

export const TRANSCRIPT_ASK_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: [...TRANSCRIPT_ASK_INTENTS] },
    text: { type: 'string' },
    clipQuery: { type: 'string' },
  },
  required: ['intent', 'text', 'clipQuery'],
  additionalProperties: false,
};

export const TRANSCRIPT_ASK_SYSTEM = [
  'You route a user message about ONE video transcript. Return JSON only.',
  'intent=question: they want facts or explanation from the transcript. text = a short grounded answer. clipQuery = "".',
  'intent=clip: they want to find, preview, or cut a moment. text = "". clipQuery = a short search phrase (the topic).',
  'intent=other: anything else (weather, coding, small talk, other videos). text = one funny sentence refusing; we only do transcript Q&A and clip finding. clipQuery = "".',
  'Do not invent transcript facts. If the transcript does not contain the answer, say so briefly.',
].join(' ');

export function parseTranscriptAskResponse(raw: unknown, question: string): TranscriptAskResult {
  const parsed = askLlmSchema.parse(raw);
  if (parsed.intent === 'clip') {
    const clipQuery = parsed.clipQuery.trim() || question.trim();
    return { intent: 'clip', text: '', clipQuery };
  }
  if (parsed.intent === 'other') {
    const text = parsed.text.trim() || funnyReject(question);
    return { intent: 'other', text, clipQuery: '' };
  }
  const text = parsed.text.trim();
  return { intent: 'question', text: text.length > 0 ? text : 'Nothing in this transcript matches that.', clipQuery: '' };
}
