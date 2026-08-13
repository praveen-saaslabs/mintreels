export const SPEAKER_BADGE_VARIANTS = [
  'speaker1',
  'speaker2',
  'speaker3',
  'speaker4',
  'speaker5',
  'speaker6',
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
} as const satisfies Record<SpeakerBadgeVariant, string>;

export function speakerSwatchClass(speaker: string): string {
  return SPEAKER_SWATCH_CLASSES[speakerBadgeVariant(speaker)];
}
