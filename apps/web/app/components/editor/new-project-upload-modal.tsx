import { Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  formatFileSize,
  MAX_UPLOAD_BYTES,
  useFileUpload,
  VIDEO_ACCEPT,
} from '@/hooks/use-file-upload';
import { ApiError, api } from '@/lib/api';

type Phase = 'idle' | 'uploading' | 'ingesting' | 'error';

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').trim();
  return base.length > 0 ? base : 'Untitled project';
}

function isHttpsFilestackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.hostname === 'cdn.filestackcontent.com') {
      return parsed.pathname.length > 1;
    }
    if (parsed.hostname === 'www.filestackapi.com') {
      return /^\/api\/file\/[^/]+/.test(parsed.pathname);
    }
    return false;
  } catch {
    return false;
  }
}

export function NewProjectUploadModal() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastUploadRef = useRef<{ url: string; fileName: string } | null>(null);

  const { uploadState, handleFileChange } = useFileUpload({
    onUploadSuccess: (state) => {
      void ingestAfterUpload(state.fileUrl, state.fileName);
    },
    onUploadError: (error) => {
      setPhase('error');
      setErrorMessage(error.message);
    },
  });

  async function ingestAfterUpload(url: string, fileName: string) {
    lastUploadRef.current = { url, fileName };
    setPhase('ingesting');
    setErrorMessage(null);

    if (!isHttpsFilestackUrl(url)) {
      setPhase('error');
      setErrorMessage('Upload returned an unsupported URL. Please try again.');
      return;
    }

    const originalFilename = fileName.trim();
    if (!originalFilename) {
      setPhase('error');
      setErrorMessage('Missing filename. Please choose the file again.');
      return;
    }

    try {
      const created = await api.createRecording({
        title: titleFromFilename(originalFilename),
        originalFilename,
        url,
      });

      if (!Number.isInteger(created.projectId) || created.projectId <= 0) {
        setPhase('error');
        setErrorMessage('Server did not return a valid project id.');
        return;
      }
      if (!Number.isInteger(created.id) || created.id <= 0) {
        setPhase('error');
        setErrorMessage('Server did not return a valid recording id.');
        return;
      }

      // Prefer /editor/{projectId} (same destination as home project cards).
      // Pass recording id + media URL so the editor can play video and poll processing immediately.
      navigate(`/editor/${String(created.projectId)}`, {
        replace: true,
        state: { recordingId: created.id, mediaUrl: url },
      });
    } catch (err) {
      setPhase('error');
      if (err instanceof ApiError) {
        setErrorMessage(
          err.status === 401
            ? 'Your session expired. Sign in again, then retry.'
            : err.code || 'Could not start ingest. Please try again.',
        );
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : 'Could not start ingest.');
    }
  }

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) {
      return;
    }
    setPhase('uploading');
    setErrorMessage(null);
    const ok = await handleFileChange(event);
    if (!ok) {
      setPhase((current) => (current === 'ingesting' ? current : 'error'));
    }
  }

  async function onRetry() {
    setErrorMessage(null);
    if (lastUploadRef.current && phase === 'error' && uploadState.fileUrl) {
      await ingestAfterUpload(lastUploadRef.current.url, lastUploadRef.current.fileName);
      return;
    }
    if (uploadState.file) {
      setPhase('uploading');
      await handleFileChange(undefined, true);
      return;
    }
    inputRef.current?.click();
  }

  const busy = phase === 'uploading' || phase === 'ingesting' || uploadState.loading;
  const showProgress = phase === 'uploading' || uploadState.loading;
  const progressValue =
    phase === 'ingesting' ? 100 : Math.min(100, Math.max(0, uploadState.progress));

  let statusLabel = 'Select a video to create a new project.';
  if (phase === 'uploading' || uploadState.loading) {
    statusLabel = uploadState.status || 'Uploading to storage…';
  } else if (phase === 'ingesting') {
    statusLabel = 'Starting ingest…';
  } else if (phase === 'error') {
    statusLabel = errorMessage ?? (uploadState.status || 'Something went wrong.');
  } else if (uploadState.fileName) {
    statusLabel = `${uploadState.fileName} · ${formatFileSize(uploadState.size)}`;
  }

  return (
    <Dialog
      open
      modal
      disablePointerDismissal
      onOpenChange={() => {
        // Non-dismissible: ignore overlay / Esc / programmatic close while on /editor/new.
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a video</DialogTitle>
          <DialogDescription>
            Choose a video file to create your project. This step cannot be skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept={VIDEO_ACCEPT}
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              void onFileSelected(event);
            }}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="glass flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--glass-border)] px-4 py-10 text-center transition-colors hover:border-[var(--mr-acc)] disabled:pointer-events-none disabled:opacity-60"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--mr-acc)]/15 text-[var(--mr-acc)]">
              <Upload className="size-5" />
            </span>
            <span className="text-sm font-medium text-[var(--mr-fg)]">
              {busy ? 'Upload in progress…' : 'Click to choose a video'}
            </span>
            <span className="text-xs text-muted-foreground">
              MP4, MOV, WebM, MKV, AVI · up to {formatFileSize(MAX_UPLOAD_BYTES)}
            </span>
          </button>

          {(showProgress || phase === 'ingesting' || phase === 'error') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className={phase === 'error' ? 'text-destructive' : undefined}>{statusLabel}</span>
                {(showProgress || phase === 'ingesting') && (
                  <span className="font-mono tabular-nums">
                    {phase === 'ingesting' ? '…' : `${String(Math.round(progressValue))}%`}
                  </span>
                )}
              </div>
              {(showProgress || phase === 'ingesting') && (
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-[var(--glass-border-subtle)]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressValue)}
                  aria-label={phase === 'ingesting' ? 'Starting ingest' : 'Upload progress'}
                >
                  <div
                    className="h-full rounded-full bg-[var(--mr-acc)] transition-[width] duration-150"
                    style={{ width: `${String(progressValue)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {phase === 'idle' && !uploadState.fileName ? (
            <p className="text-xs text-muted-foreground">{statusLabel}</p>
          ) : null}

          {phase === 'error' ? (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                Choose another file
              </Button>
              <Button type="button" onClick={() => void onRetry()}>
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
