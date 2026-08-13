import type { ComponentProps } from 'react';
import { Badge } from '@/components/ui/badge';
import { speakerBadgeVariant, speakerSwatchClass } from '@/lib/speaker-style';
import { formatSpeakerLabel } from '@/lib/transcript';
import { cn } from '@/lib/utils';

type SpeakerBadgeProps = {
  speaker: string;
  selected?: boolean;
  className?: string;
  render?: ComponentProps<typeof Badge>['render'];
};

export function SpeakerLegendDot({ speaker }: { speaker: string }) {
  return (
    <span
      aria-hidden
      data-icon="inline-start"
      className={cn('size-2 shrink-0 rounded-full', speakerSwatchClass(speaker))}
    />
  );
}

export function SpeakerBadge({ speaker, selected = false, className, render }: SpeakerBadgeProps) {
  return (
    <Badge
      variant={speakerBadgeVariant(speaker)}
      className={cn(selected && 'ring-2 ring-foreground/25', className)}
      render={render}
    >
      <SpeakerLegendDot speaker={speaker} />
      {formatSpeakerLabel(speaker)}
    </Badge>
  );
}
