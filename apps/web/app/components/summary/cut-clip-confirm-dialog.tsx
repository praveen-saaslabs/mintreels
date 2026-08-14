import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  DEFAULT_EDITOR_ASPECT,
  EDITOR_ASPECT_PRESETS,
  type EditorAspectRatio,
} from '@/stores/editor-store';

export type CutClipConfirmResult = {
  aspectRatio: EditorAspectRatio;
  /** Always fit for now — Fill/crop deferred. */
  fitMode: 'fit';
  burnSubtitles: boolean;
};

export function CutClipConfirmDialog({
  open,
  onOpenChange,
  title,
  description = 'Export this moment as a clip. Aspect matches the player; change it here if you want.',
  confirmLabel = 'Cut clip',
  pending,
  errorMessage,
  initialAspect,
  initialBurnSubtitles = true,
  onAspectChange,
  onBurnSubtitlesChange,
  onConfirm,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  pending: boolean;
  errorMessage?: string | undefined;
  initialAspect: EditorAspectRatio;
  /** Defaults from main player caption toggle. */
  initialBurnSubtitles?: boolean;
  /** Live-update player preview while the dialog is open. */
  onAspectChange?: (aspect: EditorAspectRatio) => void;
  /** Keep player caption preference in sync when toggled here. */
  onBurnSubtitlesChange?: (burn: boolean) => void;
  onConfirm: (result: CutClipConfirmResult) => void | Promise<void>;
}>) {
  const [aspect, setAspect] = useState<EditorAspectRatio>(initialAspect || DEFAULT_EDITOR_ASPECT);
  const [burnSubtitles, setBurnSubtitles] = useState(initialBurnSubtitles);

  useEffect(() => {
    if (open) {
      setAspect(initialAspect || DEFAULT_EDITOR_ASPECT);
      setBurnSubtitles(initialBurnSubtitles);
    }
  }, [open, initialAspect, initialBurnSubtitles]);

  function updateAspect(next: EditorAspectRatio) {
    setAspect(next);
    onAspectChange?.(next);
  }

  function updateBurnSubtitles(next: boolean) {
    setBurnSubtitles(next);
    onBurnSubtitlesChange?.(next);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent showCloseButton={!pending} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-medium tracking-[0.02em] text-muted-foreground">Aspect</p>
            <div className="flex gap-1">
              {EDITOR_ASPECT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    updateAspect(preset);
                  }}
                  className={cn(
                    'inline-flex h-7 items-center rounded-md px-2.5 text-[11px] font-medium tracking-[0.01em] transition-[transform,colors] duration-100 ease-out active:scale-[0.97]',
                    aspect === preset
                      ? 'bg-foreground text-background'
                      : 'glass-chip text-foreground/70 hover:bg-[var(--glass-bg-strong)]',
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Vertical and square keep the full frame with a blurred pad.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 pt-0.5">
            <input
              type="checkbox"
              className="size-3.5 accent-foreground"
              checked={burnSubtitles}
              disabled={pending}
              onChange={(event) => {
                updateBurnSubtitles(event.target.checked);
              }}
            />
            <span className="text-[12px] text-foreground/80">Burn captions into export</span>
          </label>
        </div>

        {errorMessage ? (
          <p className="text-sm text-[var(--mr-bad)]" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>Cancel</DialogClose>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              void onConfirm({
                aspectRatio: aspect,
                fitMode: 'fit',
                burnSubtitles,
              });
            }}
          >
            {pending ? 'Starting…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
