import { Select } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
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
  const items = voices.map((voice) => ({
    value: voice.id,
    label: voiceLabel(voice),
  }));

  return (
    <Select.Root
      value={value === '' ? null : value}
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
          'flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent text-left outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          size === 'xs' ? 'h-7 min-w-40 px-2 text-xs' : 'h-8 px-2 text-sm',
          className,
        )}
      >
        <Select.Value
          placeholder="Select voice"
          className="min-w-0 flex-1 truncate data-placeholder:text-muted-foreground"
        />
        <Select.Icon className="shrink-0 text-muted-foreground">
          <ChevronDownIcon className={size === 'xs' ? 'size-3' : 'size-3.5'} aria-hidden />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          className="z-70 outline-none"
          sideOffset={4}
          alignItemWithTrigger={false}
        >
          <Select.Popup
            className={cn(
              'origin-(--transform-origin) overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
              'w-(--anchor-width) min-w-48 max-w-80',
            )}
          >
            <Select.List className="max-h-[min(16rem,var(--available-height,16rem))] overflow-y-auto overscroll-contain p-1 outline-none">
              {voices.map((voice) => (
                <Select.Item
                  key={voice.id}
                  value={voice.id}
                  className={cn(
                    'grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded px-2 py-1.5 text-sm outline-none select-none',
                    'data-highlighted:bg-muted data-highlighted:text-foreground',
                    'data-disabled:pointer-events-none data-disabled:opacity-50',
                  )}
                >
                  <Select.ItemIndicator className="col-start-1 flex items-center justify-center">
                    <CheckIcon className="size-3.5 text-mr-acc" aria-hidden />
                  </Select.ItemIndicator>
                  <Select.ItemText className="col-start-2 truncate">
                    {voiceLabel(voice)}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
