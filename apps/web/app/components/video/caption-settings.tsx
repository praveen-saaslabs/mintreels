import { Settings2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

type PanelCoords = {
  right: number;
  bottom: number;
};

/**
 * Caption style popover — opens upward over the video (portaled) so sibling
 * panes / overflow parents cannot clip or bury it under the timeline.
 */
export function CaptionSettings({
  style,
  onChange,
  disabled = false,
}: Readonly<CaptionSettingsProps>) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function updatePosition() {
      const button = buttonRef.current;
      if (!button) {
        return;
      }
      const rect = button.getBoundingClientRect();
      setCoords({
        right: Math.max(8, window.innerWidth - rect.right),
        bottom: Math.max(8, window.innerHeight - rect.top + 6),
      });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    // Capture scroll from nested overflow panes (editor / spaces).
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
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

  const panel =
    open && coords
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Caption settings"
            className={cn(
              'glass-strong pointer-events-auto fixed z-100',
              'w-[min(240px,calc(100vw-2rem))] rounded-xl p-3 shadow-(--glass-shadow-elevated)',
            )}
            style={{ right: coords.right, bottom: coords.bottom }}
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative shrink-0">
      <Button
        ref={buttonRef}
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
      {panel}
    </div>
  );
}
