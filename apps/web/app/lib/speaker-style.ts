export const SPEAKER_BADGE_VARIANTS = [
  'speaker1',
  'speaker2',
  'speaker3',
  'speaker4',
  'speaker5',
  'speaker6',
  'speaker7',
  'speaker8',
  'speaker9',
  'speaker10',
] as const;

export type SpeakerBadgeVariant = (typeof SPEAKER_BADGE_VARIANTS)[number];

const PALETTE_SIZE = SPEAKER_BADGE_VARIANTS.length;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function speakerPaletteIndex(speaker: string): number {
  const trimmed = speaker.trim();
  const match = /^speaker[_-]?(\d+)$/i.exec(trimmed);
  if (match) {
    const number = Number(match[1]);
    if (Number.isInteger(number) && number > 0) {
      return (number - 1) % PALETTE_SIZE;
    }
  }

  return hashString(trimmed) % PALETTE_SIZE;
}

export function speakerBadgeVariant(speaker: string): SpeakerBadgeVariant {
  return SPEAKER_BADGE_VARIANTS[speakerPaletteIndex(speaker)] ?? SPEAKER_BADGE_VARIANTS[0];
}

const SPEAKER_SWATCH_CLASSES = {
  speaker1: 'bg-speaker-1',
  speaker2: 'bg-speaker-2',
  speaker3: 'bg-speaker-3',
  speaker4: 'bg-speaker-4',
  speaker5: 'bg-speaker-5',
  speaker6: 'bg-speaker-6',
  speaker7: 'bg-speaker-7',
  speaker8: 'bg-speaker-8',
  speaker9: 'bg-speaker-9',
  speaker10: 'bg-speaker-10',
} as const satisfies Record<SpeakerBadgeVariant, string>;

export function speakerSwatchClass(speaker: string): string {
  return SPEAKER_SWATCH_CLASSES[speakerBadgeVariant(speaker)];
}

const SPEAKER_CSS_VARS = {
  speaker1: '--speaker-1',
  speaker2: '--speaker-2',
  speaker3: '--speaker-3',
  speaker4: '--speaker-4',
  speaker5: '--speaker-5',
  speaker6: '--speaker-6',
  speaker7: '--speaker-7',
  speaker8: '--speaker-8',
  speaker9: '--speaker-9',
  speaker10: '--speaker-10',
} as const satisfies Record<SpeakerBadgeVariant, `--speaker-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`>;

/** Light-theme fallbacks matching `:root` tokens in `index.css` (SSR / missing vars). */
const SPEAKER_CSS_FALLBACKS = {
  speaker1: 'oklch(0.48 0.1 250)',
  speaker2: 'oklch(0.48 0.1 155)',
  speaker3: 'oklch(0.5 0.08 220)',
  speaker4: 'oklch(0.5 0.1 300)',
  speaker5: 'oklch(0.52 0.12 25)',
  speaker6: 'oklch(0.48 0.08 185)',
  speaker7: 'oklch(0.5 0.1 75)',
  speaker8: 'oklch(0.5 0.1 340)',
  speaker9: 'oklch(0.48 0.1 120)',
  speaker10: 'oklch(0.5 0.09 275)',
} as const satisfies Record<SpeakerBadgeVariant, string>;

/** CSS custom-property name for a speaker (`--speaker-1` … `--speaker-10`). */
export function speakerCssVar(speaker: string): (typeof SPEAKER_CSS_VARS)[SpeakerBadgeVariant] {
  return SPEAKER_CSS_VARS[speakerBadgeVariant(speaker)];
}

/**
 * Resolve a speaker token to a concrete color for canvas APIs (e.g. WaveSurfer).
 * Reads `--speaker-N` from the given element (defaults to `:root`).
 */
export function speakerCssColor(
  speaker: string,
  element: Element = document.documentElement,
): string {
  const variant = speakerBadgeVariant(speaker);
  const value = getComputedStyle(element).getPropertyValue(SPEAKER_CSS_VARS[variant]).trim();
  return value || SPEAKER_CSS_FALLBACKS[variant];
}
