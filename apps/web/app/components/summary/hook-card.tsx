import { Button } from '@/components/ui/button';
import { formatTimestamp } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { EditorHook } from '@/stores/editor-store';

type HookCardProps = {
  hook: EditorHook;
  selected: boolean;
  onPreview: () => void;
};

function formatHookDuration(start: number, end: number): string {
  return `${Math.max(0, Math.round(end - start))}s`;
}

export function HookCard({ hook, selected, onPreview }: HookCardProps) {
  const score = hook.score;

  return (
    <article
      className={cn(
        'glass flex flex-col gap-3 rounded-xl p-3 transition-shadow',
        selected
          ? 'border-[var(--mr-acc)] shadow-[var(--glass-shadow-elevated)] ring-2 ring-[color-mix(in_oklch,var(--mr-acc)_35%,transparent)]'
          : 'hover:border-[var(--glass-border)]',
      )}
    >
      <button
        type="button"
        onClick={onPreview}
        className="flex w-full flex-col gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-snug text-foreground">{hook.title}</h3>
          {score != null ? (
            <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-mr-acc">
              {score.toFixed(2)}
            </span>
          ) : null}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          {formatTimestamp(hook.start)} – {formatTimestamp(hook.end)} ·{' '}
          {formatHookDuration(hook.start, hook.end)}
        </p>
      </button>
      <div>
        <Button type="button" size="sm" variant="outline" disabled>
          Cut clip
        </Button>
      </div>
    </article>
  );
}
