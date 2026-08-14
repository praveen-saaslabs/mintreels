import { Select } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon, SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { VoiceOption } from '@/lib/api';
import { cn } from '@/lib/utils';

type VoiceSelectProps = Readonly<{
  id?: string;
  value: string;
  voices: VoiceOption[];
  disabled?: boolean;
  className?: string;
  size?: 'xs' | 'sm';
  'aria-label'?: string;
  onValueChange: (voiceId: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
}>;

function voiceLabel(voice: VoiceOption): string {
  return voice.language ? `${voice.name} (${voice.language})` : voice.name;
}

export function VoiceSelect({
  id,
  value,
  voices,
  disabled = false,
  className,
  size = 'sm',
  'aria-label': ariaLabel,
  onValueChange,
  onKeyDown,
}: VoiceSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') {
      return voices;
    }
    return voices.filter((voice) => {
      const hay = `${voice.name} ${voice.language ?? ''} ${voice.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [voices, query]);

  const items = filtered.map((voice) => ({
    value: voice.id,
    label: voiceLabel(voice),
  }));

  return (
    <Select.Root
      value={value === '' ? null : value}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery('');
        }
      }}
      onValueChange={(next) => {
        if (typeof next === 'string' && next.length > 0) {
          onValueChange(next);
        }
      }}
      disabled={disabled}
      items={items}
      modal={false}
    >
      <Select.Trigger
        id={id}
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className={cn(
          'glass-chip flex w-full min-w-0 items-center justify-between gap-2 rounded-xl text-left outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          size === 'xs' ? 'h-7 min-w-40 px-2 text-xs' : 'h-9 px-2.5 text-sm',
          className,
        )}
      >
        <Select.Value
          placeholder="Select voice"
          className="min-w-0 flex-1 truncate data-placeholder:text-muted-foreground"
        />
        <Select.Icon className="shrink-0 text-muted-foreground">
          <ChevronDownIcon
            className={cn(
              'transition-transform duration-200',
              size === 'xs' ? 'size-3' : 'size-3.5',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          className="z-70 outline-none"
          sideOffset={6}
          alignItemWithTrigger={false}
        >
          <Select.Popup
            className={cn(
              'glass-elevated origin-(--transform-origin) overflow-hidden rounded-2xl text-foreground outline-none',
              'border border-[color-mix(in_oklch,var(--glass-border)_80%,transparent)]',
              'shadow-(--glass-shadow-elevated)',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
              'w-[max(var(--anchor-width),14rem)] min-w-56 max-w-80',
            )}
          >
            <div className="border-b border-[color-mix(in_oklch,var(--glass-border-subtle)_90%,transparent)] p-1.5">
              <label className="relative block">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  placeholder="Search voices…"
                  aria-label="Search voices"
                  autoComplete="off"
                  className={cn(
                    'h-8 w-full rounded-lg bg-transparent pr-2 pl-7 text-sm outline-none',
                    'placeholder:text-muted-foreground',
                    'focus-visible:ring-2 focus-visible:ring-ring/40',
                  )}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    // Keep typing in the filter without hijacking select keyboard nav for arrows.
                    if (event.key === 'Escape') {
                      return;
                    }
                    event.stopPropagation();
                  }}
                />
              </label>
            </div>

            <Select.List className="max-h-[min(14rem,var(--available-height,14rem))] overflow-y-auto overscroll-contain p-1 outline-none">
              {filtered.length === 0 ? (
                <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                  No voices match
                </p>
              ) : (
                filtered.map((voice) => (
                  <Select.Item
                    key={voice.id}
                    value={voice.id}
                    className={cn(
                      'grid cursor-default grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2 py-2 text-sm outline-none select-none',
                      'data-highlighted:bg-[color-mix(in_oklch,var(--mr-acc)_12%,transparent)] data-highlighted:text-foreground',
                      'data-selected:bg-[color-mix(in_oklch,var(--mr-acc)_10%,transparent)]',
                      'data-disabled:pointer-events-none data-disabled:opacity-50',
                    )}
                  >
                    <Select.ItemIndicator className="col-start-1 flex items-center justify-center">
                      <CheckIcon className="size-3.5 text-mr-acc" aria-hidden />
                    </Select.ItemIndicator>
                    <Select.ItemText className="col-start-2 truncate font-medium">
                      {voice.name}
                    </Select.ItemText>
                    {voice.language ? (
                      <span className="col-start-3 rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                        {voice.language}
                      </span>
                    ) : null}
                  </Select.Item>
                ))
              )}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
