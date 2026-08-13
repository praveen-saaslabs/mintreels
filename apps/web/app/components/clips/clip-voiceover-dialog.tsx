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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import type { ClipVoiceover, ClipVoiceoverPlacement } from '@/lib/data/types';
import { queryKeys } from '@/lib/query-keys';

type ClipVoiceoverDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle: string;
  onConfirm: (voiceover: ClipVoiceover | null) => void;
  pending?: boolean;
};

export function ClipVoiceoverDialog({
  open,
  onOpenChange,
  defaultTitle,
  onConfirm,
  pending = false,
}: Readonly<ClipVoiceoverDialogProps>) {
  const [enabled, setEnabled] = useState(false);
  const [voiceId, setVoiceId] = useState('');
  const [titleText, setTitleText] = useState(defaultTitle);
  const [ctaText, setCtaText] = useState('');
  const [placement, setPlacement] = useState<ClipVoiceoverPlacement>('duck');

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
    setTitleText(defaultTitle);
    setCtaText('');
    setEnabled(false);
    setPlacement('duck');
  }, [open, defaultTitle]);

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
    if (voiceId.trim() === '') {
      return;
    }
    onConfirm({
      enabled: true,
      voiceId: voiceId.trim(),
      ...(titleText.trim() !== '' ? { titleText: titleText.trim() } : {}),
      ...(ctaText.trim() !== '' ? { ctaText: ctaText.trim() } : {}),
      placement,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Cut clip</DialogTitle>
          <DialogDescription>
            Optionally add an AI voiceover (title and CTA) mixed onto the export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={enabled}
              disabled={pending}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Add AI voiceover
          </label>

          {enabled ? (
            <div className="space-y-3 rounded-md border border-[var(--glass-border-subtle)] p-3">
              <div className="space-y-1.5">
                <Label htmlFor="clip-vo-voice">Voice</Label>
                <select
                  id="clip-vo-voice"
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={voiceId}
                  disabled={pending || voicesQuery.isLoading}
                  onChange={(event) => setVoiceId(event.target.value)}
                >
                  {(voicesQuery.data ?? []).map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                      {voice.language ? ` (${voice.language})` : ''}
                    </option>
                  ))}
                </select>
                {voicesQuery.isError ? (
                  <p className="text-xs text-[var(--mr-bad)]">Could not load voices.</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clip-vo-title">Title line</Label>
                <Input
                  id="clip-vo-title"
                  value={titleText}
                  disabled={pending}
                  onChange={(event) => setTitleText(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clip-vo-cta">CTA (optional)</Label>
                <Input
                  id="clip-vo-cta"
                  value={ctaText}
                  disabled={pending}
                  placeholder="Follow for more"
                  onChange={(event) => setCtaText(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clip-vo-placement">Placement</Label>
                <select
                  id="clip-vo-placement"
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={placement}
                  disabled={pending}
                  onChange={(event) =>
                    setPlacement(event.target.value as ClipVoiceoverPlacement)
                  }
                >
                  <option value="duck">Duck under clip audio</option>
                  <option value="pre">Play before clip audio</option>
                </select>
              </div>
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
            disabled={pending || (enabled && voiceId.trim() === '')}
            onClick={() => confirm(enabled)}
          >
            {pending ? 'Starting…' : 'Cut clip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
