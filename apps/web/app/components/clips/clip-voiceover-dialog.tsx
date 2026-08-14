import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { VoiceSelect } from '@/components/ui/voice-select';
import { api } from '@/lib/api';
import type { ClipVoiceover, ClipVoiceoverPlacement } from '@/lib/data/types';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const SCRIPT_MAX = 500;

type ClipVoiceoverDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle: string;
  onConfirm: (voiceover: ClipVoiceover | null) => void;
  pending?: boolean;
  /** clip = optional VO on export; recording = always apply VO to source video */
  variant?: 'clip' | 'recording';
};

type PlacementOption = {
  value: ClipVoiceoverPlacement;
  label: string;
  hint: string;
};

export function ClipVoiceoverDialog({
  open,
  onOpenChange,
  defaultTitle,
  onConfirm,
  pending = false,
  variant = 'clip',
}: Readonly<ClipVoiceoverDialogProps>) {
  const isRecording = variant === 'recording';
  const [enabled, setEnabled] = useState(isRecording);
  const [voiceId, setVoiceId] = useState('');
  const [script, setScript] = useState(defaultTitle);
  const [placement, setPlacement] = useState<ClipVoiceoverPlacement>('pre');

  const voicesQuery = useQuery({
    queryKey: queryKeys.voices.list(),
    queryFn: () => api.getVoices(),
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setScript(defaultTitle.slice(0, SCRIPT_MAX));
    setEnabled(isRecording);
    setPlacement('pre');
  }, [open, defaultTitle, isRecording]);

  useEffect(() => {
    if (!open || voiceId !== '' || !voicesQuery.data?.length) {
      return;
    }
    const first = voicesQuery.data[0];
    if (first) {
      setVoiceId(first.id);
    }
  }, [open, voiceId, voicesQuery.data]);

  function confirm(withVoiceover: boolean) {
    if (!withVoiceover) {
      onConfirm(null);
      return;
    }
    const spoken = script.trim();
    if (voiceId.trim() === '' || spoken === '') {
      return;
    }
    onConfirm({
      enabled: true,
      voiceId: voiceId.trim(),
      titleText: spoken,
      placement,
    });
  }

  const showForm = isRecording || enabled;
  const scriptLength = script.trim().length;
  const canSubmit = !pending && (!showForm || (voiceId.trim() !== '' && scriptLength > 0));

  const dialogTitle = isRecording ? 'Mint Voiceover' : 'Cut clip';
  const dialogDescription = isRecording
    ? 'Mint speaks your line before or after this video.'
    : 'Export this moment as a clip. Optionally add a short spoken line before or after.';
  const confirmLabel = isRecording ? 'Add Mint Voiceover' : 'Cut clip';

  const placementOptions: PlacementOption[] = isRecording
    ? [
        {
          value: 'pre',
          label: 'Before the video',
          hint: 'Holds the first frame while Mint speaks, then the video starts',
        },
        {
          value: 'post',
          label: 'After the video',
          hint: 'Holds the last frame while Mint speaks at the end',
        },
      ]
    : [
        {
          value: 'pre',
          label: 'Before the clip',
          hint: 'Plays first, then your clip begins',
        },
        {
          value: 'post',
          label: 'After the clip',
          hint: 'Plays after your clip ends',
        },
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isRecording ? (
            <label className="flex items-center gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-3.5 accent-mr-acc"
                checked={enabled}
                disabled={pending}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              <span>Add a spoken Voiceover</span>
            </label>
          ) : null}

          {showForm ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="clip-vo-script">What should Mint say?</Label>
                <textarea
                  id="clip-vo-script"
                  value={script}
                  disabled={pending}
                  rows={3}
                  maxLength={SCRIPT_MAX}
                  placeholder="e.g. Protecting mental health. Follow for more."
                  className="w-full resize-none rounded-md border border-input bg-(--glass-bg) px-2.5 py-2 text-sm leading-relaxed shadow-(--glass-highlight) outline-none backdrop-blur-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(event) => setScript(event.target.value.slice(0, SCRIPT_MAX))}
                />
                <p className="text-xs text-muted-foreground">
                  {scriptLength}/{SCRIPT_MAX} · Spoken as one continuous line
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clip-vo-voice">Narrator</Label>
                <VoiceSelect
                  id="clip-vo-voice"
                  value={voiceId}
                  voices={voicesQuery.data ?? []}
                  disabled={pending || voicesQuery.isLoading}
                  aria-label="Narrator voice"
                  onValueChange={setVoiceId}
                />
                {voicesQuery.isError ? (
                  <p className="text-xs text-(--mr-bad)">Could not load voices.</p>
                ) : null}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">When should it play?</legend>
                <div className="grid gap-2">
                  {placementOptions.map((option) => {
                    const selected = placement === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={pending}
                        aria-pressed={selected}
                        onClick={() => setPlacement(option.value)}
                        className={cn(
                          'rounded-md border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
                          selected
                            ? 'border-ring bg-(--glass-bg) shadow-(--glass-highlight)'
                            : 'border-input hover:border-ring/60',
                        )}
                      >
                        <span className="block text-sm font-medium text-foreground">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => confirm(showForm)}
            className={cn(pending && 'animate-mr-pulse')}
          >
            {pending ? 'Starting…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
