/** Stable speaker → color mapping for transcript / speaker chips. */

export type SpeakerColor = {
  /** Solid accent for labels / legend chips */
  solid: string;
  /** Semi-transparent fill for optional speaker UI accents */
  region: string;
};

const SPEAKER_PALETTE: readonly SpeakerColor[] = [
  {
    solid: 'oklch(0.62 0.13 165)',
    region: 'oklch(0.62 0.13 165 / 0.28)',
  },
  {
    solid: 'oklch(0.58 0.16 250)',
    region: 'oklch(0.58 0.16 250 / 0.28)',
  },
  {
    solid: 'oklch(0.68 0.14 45)',
    region: 'oklch(0.68 0.14 45 / 0.28)',
  },
  {
    solid: 'oklch(0.6 0.17 330)',
    region: 'oklch(0.6 0.17 330 / 0.28)',
  },
  {
    solid: 'oklch(0.55 0.12 85)',
    region: 'oklch(0.55 0.12 85 / 0.28)',
  },
] as const;

const FALLBACK: SpeakerColor = {
  solid: 'oklch(0.556 0 0)',
  region: 'oklch(0.556 0 0 / 0.22)',
};

function speakerSortKey(speaker: string): string {
  const match = /^speaker[_-]?(\d+)$/i.exec(speaker.trim());
  if (match?.[1]) {
    return match[1].padStart(4, '0');
  }
  return speaker.toLowerCase();
}

/** Assign palette indices by sorted unique speaker ids (stable across renders). */
export function buildSpeakerColorMap(speakers: readonly string[]): Map<string, SpeakerColor> {
  const unique = [...new Set(speakers.filter(Boolean))].sort((a, b) =>
    speakerSortKey(a).localeCompare(speakerSortKey(b)),
  );

  const map = new Map<string, SpeakerColor>();
  unique.forEach((speaker, index) => {
    map.set(speaker, SPEAKER_PALETTE[index % SPEAKER_PALETTE.length] ?? FALLBACK);
  });
  return map;
}

export function getSpeakerColor(
  speaker: string,
  colorMap?: ReadonlyMap<string, SpeakerColor>,
): SpeakerColor {
  if (!speaker) {
    return FALLBACK;
  }
  return colorMap?.get(speaker) ?? FALLBACK;
}

export function formatSpeakerLabel(speaker: string): string {
  const match = /^speaker[_-]?(\d+)$/i.exec(speaker.trim());
  if (match?.[1]) {
    return `Speaker ${match[1]}`;
  }
  return speaker;
}
