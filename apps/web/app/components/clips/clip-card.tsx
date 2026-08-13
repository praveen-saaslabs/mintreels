import { cn } from '@/lib/utils';
import {
  formatClipCaption,
  formatClipDuration,
  formatClipProjectLabel,
  formatClipRange,
} from '@/lib/data/format';
import type { ClipSummary } from '@/lib/data/types';

function statusClasses(status: ClipSummary['status']) {
  switch (status) {
    case 'ready':
      return 'bg-[color-mix(in_oklch,var(--mr-acc)_14%,transparent)] text-[var(--mr-acc)]';
    case 'rendering':
    case 'queued':
      return 'bg-[color-mix(in_oklch,var(--mr-warn)_14%,transparent)] text-[var(--mr-warn)]';
    case 'failed':
      return 'bg-[color-mix(in_oklch,var(--mr-bad)_14%,transparent)] text-[var(--mr-bad)]';
    default:
      return 'bg-[var(--mr-muted)] text-[var(--mr-mfg)]';
  }
}

export function ClipCard({ clip }: { clip: ClipSummary }) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex aspect-[9/16] max-h-[268px] flex-col justify-between bg-[repeating-linear-gradient(135deg,var(--mr-stripe3)_0_10px,var(--mr-stripe4)_10px_20px)] p-2.5">
        <div className="flex items-start justify-between">
          <span className="glass-chip inline-flex h-[19px] items-center rounded-full px-1.5 font-mono text-[10px] text-[var(--mr-onstripe)]">
            {clip.ratio ?? '—'}
          </span>
          <span className="glass-chip inline-flex h-[19px] items-center rounded-full px-1.5 font-mono text-[10px] text-[var(--mr-onstripe)]">
            {formatClipDuration(clip)}
          </span>
        </div>
        <span className="glass-chip mb-3.5 self-center rounded-md px-2 py-0.5 text-center text-[13px] font-semibold text-[var(--mr-onstripe)]">
          {formatClipCaption(clip)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 p-2.5">
        <div className="text-[12.5px] leading-snug font-medium text-pretty">{clip.title}</div>
        <div className="truncate text-[10.5px] text-[var(--mr-mfg)]">
          {formatClipProjectLabel(clip)}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] text-[var(--mr-mfg)]">
            {formatClipRange(clip)}
          </span>
          <span
            className={cn(
              'inline-flex h-[18px] items-center rounded-full px-1.5 text-[10px] font-medium capitalize',
              statusClasses(clip.status),
            )}
          >
            {clip.status}
          </span>
        </div>
      </div>
    </div>
  );
}
