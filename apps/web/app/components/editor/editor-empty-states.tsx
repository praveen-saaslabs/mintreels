import type { LucideIcon } from 'lucide-react';
import { AlignLeft, AudioLines, Captions, Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

function EditorEmptyState({
  icon: Icon,
  label,
  className,
  compact = false,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  className?: string;
  compact?: boolean;
}>) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn('flex flex-col items-center justify-center gap-2 text-center', className)}
    >
      <Icon className="size-4 text-[var(--mr-acc)]" aria-hidden />
      <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>{label}</p>
    </div>
  );
}

export function TranscriptPanelEmptyState() {
  return (
    <EditorEmptyState
      icon={Captions}
      label="Transcript will appear here"
      className="px-4 py-12"
    />
  );
}

export function HooksListEmptyState() {
  return (
    <EditorEmptyState icon={Sparkles} label="Hooks will appear here" className="px-4 py-12" />
  );
}

export function SummaryTextEmptyState() {
  return (
    <EditorEmptyState icon={AlignLeft} label="Summary will appear here" className="px-4 py-12" />
  );
}

export function VideoSurfaceEmptyState({ className }: Readonly<{ className?: string }>) {
  return (
    <EditorEmptyState
      icon={Play}
      label="Video will play here"
      className={cn('absolute inset-0 rounded-2xl bg-muted/40', className)}
    />
  );
}

export function WaveformEmptyState() {
  return (
    <EditorEmptyState
      icon={AudioLines}
      label="Waveform will appear here"
      compact
      className="pointer-events-none absolute inset-0"
    />
  );
}
