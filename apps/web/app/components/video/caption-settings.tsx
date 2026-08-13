import { Settings2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { CaptionPlacement } from './video-subtitles';

export type CaptionStyle = {
  placement: CaptionPlacement;
  fontSizePx: number;
  backgroundOpacity: number;
};

const PLACEMENTS: CaptionPlacement[] = ['top', 'bottom'];

type CaptionSettingsProps = {
  style: CaptionStyle;
  onChange: (next: CaptionStyle) => void;
  disabled?: boolean;
};

export function CaptionSettings({
  style,
  onChange,
  disabled = false,
}: Readonly<CaptionSettingsProps>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node) || root.contains(event.target)) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Caption settings"
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        className={cn(
          'size-[34px] shrink-0 rounded transition-transform duration-100 ease-out active:scale-[0.97]',
          open ? 'text-foreground' : 'text-foreground/70',
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <Settings2 className="size-3.5" />
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-label="Caption settings"
          className="glass pointer-events-auto absolute right-0 bottom-[calc(100%+8px)] z-20 w-[220px] rounded p-3"
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Placement</Label>
              <div className="flex gap-1" role="group" aria-label="Caption placement">
                {PLACEMENTS.map((placement) => (
                  <button
                    key={placement}
                    type="button"
                    onClick={() => onChange({ ...style, placement })}
                    className={cn(
                      'inline-flex h-[26px] flex-1 items-center justify-center rounded px-2.5 text-[11px] font-medium capitalize tracking-[0.01em] transition-[transform,colors] duration-100 ease-out active:scale-[0.97]',
                      style.placement === placement
                        ? 'bg-foreground text-background'
                        : 'glass-chip text-foreground/70 hover:bg-[var(--glass-bg-strong)]',
                    )}
                  >
                    {placement}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground" htmlFor="caption-font-size">
                Font size {String(style.fontSizePx)}px
              </Label>
              <input
                id="caption-font-size"
                type="range"
                min={12}
                max={28}
                step={1}
                value={style.fontSizePx}
                onChange={(event) =>
                  onChange({ ...style, fontSizePx: Number(event.currentTarget.value) })
                }
                className="w-full accent-[var(--mr-acc)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground" htmlFor="caption-bg-opacity">
                Background {String(Math.round(style.backgroundOpacity * 100))}%
              </Label>
              <input
                id="caption-bg-opacity"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={style.backgroundOpacity}
                onChange={(event) =>
                  onChange({ ...style, backgroundOpacity: Number(event.currentTarget.value) })
                }
                className="w-full accent-[var(--mr-acc)]"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
