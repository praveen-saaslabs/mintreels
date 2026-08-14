import {
  Check,
  Copy,
  Facebook,
  Instagram,
  Link2,
  Linkedin,
  Loader2,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import {
  buildClipboardShareText,
  buildShareIntentUrl,
  canUseNativeShare,
  copyTextToClipboard,
  isShareableHttpsUrl,
  openShareIntent,
  pasteStatusMessage,
  platformRequiresPaste,
  shareNative,
  type SharePlatformId,
} from '@/lib/share-clip';
import { cn } from '@/lib/utils';

type ShareClipModalProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  clipId?: number | null;
  socialTitle?: string | null;
  socialDescription?: string | null;
}>;

type PlatformAction = {
  id: Exclude<SharePlatformId, 'copy' | 'native'>;
  label: string;
  hint?: string;
  icon: ReactNode;
  tone: string;
};

const PLATFORM_ACTIONS: readonly PlatformAction[] = [
  {
    id: 'x',
    label: 'X',
    icon: <span className="text-[13px] font-semibold tracking-tight">𝕏</span>,
    tone: 'bg-foreground text-background',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    hint: 'Copies title, description & link — paste into your Facebook post',
    icon: <Facebook className="size-4" />,
    tone: 'bg-[#1877F2]/15 text-[#1877F2]',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    hint: 'Copies title, description & link — paste into your LinkedIn post',
    icon: <Linkedin className="size-4" />,
    tone: 'bg-[#0A66C2]/15 text-[#0A66C2]',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: <MessageCircle className="size-4" />,
    tone: 'bg-[#25D366]/15 text-[#128C7E]',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: <Send className="size-4" />,
    tone: 'bg-[#229ED9]/15 text-[#229ED9]',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    hint: 'Copies title, description & link — paste in the app',
    icon: <Instagram className="size-4" />,
    tone: 'bg-[#E1306C]/15 text-[#E1306C]',
  },
];

export function ShareClipModal({
  open,
  onOpenChange,
  url,
  title,
  clipId = null,
  socialTitle = null,
  socialDescription = null,
}: ShareClipModalProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState(socialTitle?.trim() || title);
  const [draftDescription, setDraftDescription] = useState(socialDescription?.trim() ?? '');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const shareable = isShareableHttpsUrl(url);
  const showNative = canUseNativeShare();
  const canGenerate = clipId != null && Number.isFinite(clipId) && clipId > 0;
  const hasStoredSocial = Boolean(socialTitle?.trim() || draftDescription.trim());

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (clipId == null) {
        throw new Error('Missing clip');
      }
      return api.generateClipSocialCopy(clipId);
    },
    onSuccess: (clip) => {
      setDraftTitle(clip.socialTitle?.trim() || clip.title);
      setDraftDescription(clip.socialDescription?.trim() ?? '');
      setGenerateError(null);
      setStatus('Social copy ready — edit before sharing');
      queryClient.setQueryData(queryKeys.clips.detail(clip.id), clip);
      void queryClient.invalidateQueries({ queryKey: queryKeys.clips.list() });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setGenerateError(error.code || error.message);
        return;
      }
      setGenerateError(error instanceof Error ? error.message : 'Generate failed');
    },
  });

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setStatus(null);
      setGenerateError(null);
      return;
    }
    setDraftTitle(socialTitle?.trim() || title);
    setDraftDescription(socialDescription?.trim() ?? '');
    if (clipId == null) {
      return;
    }
    let cancelled = false;
    void api
      .getClip(clipId)
      .then((clip) => {
        if (cancelled) {
          return;
        }
        if (clip.socialTitle?.trim()) {
          setDraftTitle(clip.socialTitle.trim());
        }
        if (clip.socialDescription?.trim()) {
          setDraftDescription(clip.socialDescription.trim());
        }
      })
      .catch(() => {
        // Keep prop/title defaults when detail fetch fails.
      });
    return () => {
      cancelled = true;
    };
  }, [open, title, socialTitle, socialDescription, clipId]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCopied(false);
      setStatus(null);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopyLink(): Promise<void> {
    if (!shareable) {
      return;
    }
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopied(true);
      setStatus('Link copied');
    }
  }

  async function handleCopyPost(): Promise<void> {
    if (!shareable) {
      return;
    }
    const text = buildClipboardShareText(draftTitle, url, draftDescription);
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopied(true);
      setStatus('Post text copied');
    }
  }

  async function handlePlatform(id: PlatformAction['id']): Promise<void> {
    if (!shareable) {
      return;
    }

    if (platformRequiresPaste(id)) {
      const pasteText = buildClipboardShareText(draftTitle, url, draftDescription);
      const ok = await copyTextToClipboard(pasteText);
      if (ok) {
        setCopied(true);
        setStatus(pasteStatusMessage(id));
      }
      const intent = buildShareIntentUrl(id, url, draftTitle, draftDescription);
      if (intent) {
        openShareIntent(intent);
      }
      return;
    }

    const intent = buildShareIntentUrl(id, url, draftTitle, draftDescription);
    if (intent) {
      openShareIntent(intent);
    }
  }

  async function handleNative(): Promise<void> {
    if (!shareable) {
      return;
    }
    await shareNative(url, draftTitle, draftDescription);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="w-[min(100%-2rem,26rem)] max-w-none overflow-hidden sm:max-w-none"
      >
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="flex min-w-0 items-center gap-2 tracking-[-0.01em]">
            <Share2 className="size-4 shrink-0 text-[var(--mr-acc)]" aria-hidden />
            <span className="truncate">Share clip</span>
          </DialogTitle>
          <DialogDescription className="text-pretty">
            {status
              ? status
              : shareable
                ? 'Generate social copy, edit it, then copy or open a platform.'
                : 'This clip does not have a shareable HTTPS link yet.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="share-clip-title" className="text-[11px] font-medium text-muted-foreground">
                Title
              </label>
              {canGenerate ? (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={generateMutation.isPending}
                  onClick={() => {
                    void generateMutation.mutateAsync();
                  }}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  {generateMutation.isPending
                    ? 'Generating…'
                    : hasStoredSocial || draftDescription.trim()
                      ? 'Regenerate'
                      : 'Generate'}
                </Button>
              ) : null}
            </div>
            <Input
              id="share-clip-title"
              value={draftTitle}
              maxLength={120}
              disabled={!shareable}
              onChange={(event) => {
                setDraftTitle(event.target.value);
              }}
              placeholder="Share title"
            />
            <label
              htmlFor="share-clip-description"
              className="text-[11px] font-medium text-muted-foreground"
            >
              Description
            </label>
            <textarea
              id="share-clip-description"
              value={draftDescription}
              maxLength={2200}
              rows={4}
              disabled={!shareable}
              placeholder="Short post description for social"
              onChange={(event) => {
                setDraftDescription(event.target.value);
              }}
              className={cn(
                'w-full min-w-0 resize-y rounded border border-input bg-[var(--glass-bg)] px-2.5 py-2',
                'text-sm shadow-[var(--glass-highlight)] outline-none backdrop-blur-sm',
                'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              )}
            />
            {generateError ? (
              <p className="text-[11px] text-[var(--mr-bad)]">{generateError}</p>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-strong)] px-3 py-2">
            <Link2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
              {shareable ? url : 'No link available'}
            </p>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="shrink-0"
              disabled={!shareable}
              onClick={() => {
                void handleCopyLink();
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Link'}
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full max-w-full justify-start gap-2"
            disabled={!shareable}
            onClick={() => {
              void handleCopyPost();
            }}
          >
            <Copy className="size-4 shrink-0" />
            <span className="truncate">Copy title, description & link</span>
          </Button>

          {showNative ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full max-w-full justify-start gap-2"
              disabled={!shareable}
              onClick={() => {
                void handleNative();
              }}
            >
              <Share2 className="size-4 shrink-0" />
              <span className="truncate">Share via device…</span>
            </Button>
          ) : null}

          <ul className="grid w-full min-w-0 grid-cols-3 gap-2">
            {PLATFORM_ACTIONS.map((platform) => {
              const showCheck = copied && platformRequiresPaste(platform.id);

              return (
                <li key={platform.id} className="min-w-0">
                  <button
                    type="button"
                    disabled={!shareable}
                    title={platform.hint}
                    onClick={() => {
                      void handlePlatform(platform.id);
                    }}
                    className={cn(
                      'flex w-full min-w-0 flex-col items-center gap-2 rounded-xl px-1.5 py-3',
                      'border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-strong)]',
                      'text-center transition-[transform,border-color] outline-none',
                      'hover:border-[var(--glass-border)] focus-visible:ring-2 focus-visible:ring-ring/50',
                      'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex size-9 shrink-0 items-center justify-center rounded-full',
                        platform.tone,
                      )}
                      aria-hidden
                    >
                      {showCheck ? <Check className="size-4" /> : platform.icon}
                    </span>
                    <span className="w-full truncate text-[11px] font-medium text-foreground">
                      {showCheck ? 'Copied' : platform.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
