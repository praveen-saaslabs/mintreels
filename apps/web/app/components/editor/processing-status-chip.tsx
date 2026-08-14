import { ChevronDown, Loader2, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ProjectEditorPhase } from '@/hooks/use-project-editor';
import type { RecordingProcessingSnapshot } from '@/lib/api';
import { cn } from '@/lib/utils';

function formatStepLabel(step: string): string {
  return step
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function friendlyCurrentLabel(step: string | null | undefined): string | null {
  if (!step) {
    return null;
  }
  const key = step.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const map: Record<string, string> = {
    AUDIO_EXTRACTION: 'Extracting audio…',
    AUDIO_UPLOAD: 'Uploading audio…',
    TRANSCRIPTION: 'Transcribing…',
    TRANSCRIPTION_PERSIST: 'Saving transcript…',
    SUMMARY: 'Summarizing…',
    ACTION_ITEMS: 'Finding action items…',
    HOOKS: 'Finding hooks…',
    CLIP_RECOMMENDATIONS: 'Recommending clips…',
  };
  return map[key] ?? `${formatStepLabel(step)}…`;
}

function statusTone(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-foreground';
    case 'processing':
    case 'retrying':
      return 'text-[var(--mr-acc)]';
    case 'failed':
      return 'text-[var(--mr-bad)]';
    default:
      return 'text-muted-foreground';
  }
}

function formatAuditTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type ProcessingStatusChipProps = Readonly<{
  phase: ProjectEditorPhase;
  processing: RecordingProcessingSnapshot | undefined;
  errorMessage?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}>;

function buildChipSummary(
  failed: boolean,
  logOnly: boolean,
  currentLabel: string | null,
  progressLabel: string | null,
): string {
  if (failed) {
    return 'Ingest failed';
  }
  if (logOnly) {
    return 'Job log';
  }
  if (currentLabel) {
    return currentLabel;
  }
  if (progressLabel) {
    return progressLabel;
  }
  return 'Processing…';
}

export function ProcessingStatusChip({
  phase,
  processing,
  errorMessage,
  onRetry,
  retrying = false,
}: ProcessingStatusChipProps) {
  const [expanded, setExpanded] = useState(false);

  const steps = processing?.steps ?? [];
  const audit = processing?.audit ?? [];
  const exportInFlight =
    processing?.exportStatus === 'queued' || processing?.exportStatus === 'rendering';
  const active = phase === 'processing' || phase === 'failed' || exportInFlight;
  const logOnly = !active && audit.length > 0;

  if (!active && !logOnly) {
    return null;
  }

  const doneCount = steps.filter(
    (step) => step.status === 'completed' || step.status === 'skipped',
  ).length;
  const total = steps.length;
  const progressLabel = total > 0 ? `${String(doneCount)}/${String(total)} done` : null;
  const currentLabel = friendlyCurrentLabel(processing?.job?.currentStep);
  const failed = phase === 'failed';
  const summary = buildChipSummary(failed, logOnly, currentLabel, progressLabel);

  return (
    <div className="pointer-events-auto absolute top-3 right-3 z-20 max-w-[min(100%-1.5rem,22rem)]">
      <div
        className={cn(
          'glass-elevated glass-materialize overflow-hidden rounded-xl',
          failed && 'border-(--mr-bad)/40',
        )}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-left transition-transform duration-100 ease-out active:scale-[0.98]"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {failed ? (
            <span className="size-2 shrink-0 rounded-full bg-(--mr-bad)" aria-hidden />
          ) : logOnly ? (
            <ScrollText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-mr-acc" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
            {summary}
          </span>
          {progressLabel && !failed && !logOnly ? (
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {progressLabel}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-180',
            )}
            aria-hidden
          />
        </button>

        {expanded ? (
          <div className="max-h-72 space-y-3 overflow-y-auto border-t border-(--glass-border-subtle) px-3 py-2.5">
            {failed && errorMessage && steps.length === 0 ? (
              <p className="text-xs text-(--mr-bad)">{errorMessage}</p>
            ) : null}
            {!logOnly && steps.length > 0 ? (
              <ul className="space-y-1.5">
                {steps.map((step) => (
                  <li
                    key={step.step}
                    className="flex items-center justify-between gap-3 text-[11px]"
                  >
                    <span className="truncate text-foreground/90">{formatStepLabel(step.step)}</span>
                    <span className={cn('shrink-0 font-mono', statusTone(step.status))}>
                      {step.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {!logOnly && steps.length === 0 && active ? (
              <p className="text-xs text-muted-foreground">Waiting for pipeline steps…</p>
            ) : null}

            {audit.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium tracking-[0.02em] text-muted-foreground">
                  Job log
                </p>
                <ul className="space-y-1.5 font-mono text-[10px] leading-snug text-muted-foreground">
                  {audit.map((entry, index) => (
                    <li
                      key={`${String(entry.jobId)}-${entry.event}-${entry.createdAt}-${String(index)}`}
                      className="flex gap-2"
                    >
                      <span className="shrink-0 text-muted-foreground/70">
                        {formatAuditTime(entry.createdAt)}
                      </span>
                      <span className="min-w-0 break-words text-foreground/80">
                        {entry.message?.trim() || entry.event}
                        {entry.step ? ` · ${entry.step}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {failed && onRetry ? (
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={retrying}
                  onClick={onRetry}
                >
                  {retrying ? 'Retrying…' : 'Retry'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
