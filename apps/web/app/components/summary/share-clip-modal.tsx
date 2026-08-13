import {
  Check,
  Copy,
  Facebook,
  Instagram,
  Link2,
  Linkedin,
  MessageCircle,
  Send,
  Share2,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  buildClipboardShareText,
  buildShareIntentUrl,
  canUseNativeShare,
  copyTextToClipboard,
  isShareableHttpsUrl,
  openShareIntent,
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
    icon: <Facebook className="size-4" />,
    tone: 'bg-[#1877F2]/15 text-[#1877F2]',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    hint: 'Copies link — paste into your LinkedIn post',
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
    hint: 'Copies link to paste in the app',
    icon: <Instagram className="size-4" />,
    tone: 'bg-[#E1306C]/15 text-[#E1306C]',
  },
];

export function ShareClipModal({ open, onOpenChange, url, title }: ShareClipModalProps) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const shareable = isShareableHttpsUrl(url);
  const showNative = canUseNativeShare();

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setStatus(null);
    }
  }, [open]);

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

  async function handleCopy(): Promise<void> {
    if (!shareable) {
      return;
    }
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopied(true);
      setStatus('Link copied');
    }
  }

  async function handlePlatform(id: PlatformAction['id']): Promise<void> {
    if (!shareable) {
      return;
    }

    if (platformRequiresPaste(id)) {
      const pasteText =
        id === 'linkedin' ? buildClipboardShareText(title, url) : url;
      const ok = await copyTextToClipboard(pasteText);
      if (ok) {
        setCopied(true);
        setStatus(
          id === 'linkedin'
            ? 'Copied — paste into your LinkedIn post'
            : 'Copied — paste in Instagram',
        );
      }
      const intent = buildShareIntentUrl(id, url, title);
      if (intent) {
        openShareIntent(intent);
      }
      return;
    }

    const intent = buildShareIntentUrl(id, url, title);
    if (intent) {
      openShareIntent(intent);
    }
  }

  async function handleNative(): Promise<void> {
    if (!shareable) {
      return;
    }
    await shareNative(url, title);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="w-[min(100%-2rem,24rem)] max-w-none overflow-hidden sm:max-w-none"
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
                ? 'Copy the link or open a platform to share this clip.'
                : 'This clip does not have a shareable HTTPS link yet.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-3">
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
                void handleCopy();
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

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
