import { cn } from '@/lib/utils';
import type { ProviderRow } from '@/lib/data/types';
import { useSettingsQuery } from '@/hooks/use-home-queries';

function statusClasses(status: ProviderRow['status']) {
  if (status === 'connected') {
    return 'bg-[color-mix(in_oklch,var(--mr-acc)_14%,transparent)] text-[var(--mr-acc)]';
  }
  return 'bg-[var(--mr-muted)] text-[var(--mr-mfg)]';
}

function statusLabel(status: ProviderRow['status']) {
  return status === 'connected' ? 'connected' : 'not set';
}

export function ProvidersSection() {
  const { data: settings, isLoading, error, refetch } = useSettingsQuery();

  if (error) {
    return (
      <div className="space-y-3 glass rounded border-[color-mix(in_oklch,var(--mr-bad)_40%,transparent)] p-4 text-sm text-[var(--mr-bad)]">
        <p>{error instanceof Error ? error.message : 'Failed to load settings'}</p>
        <button
          type="button"
          className="text-[var(--mr-fg)] underline"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="text-[11px] font-semibold tracking-[0.06em] text-[var(--mr-mfg)] uppercase">
        Providers
      </div>
      <div className="glass overflow-hidden rounded">
        {isLoading || !settings
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse border-t border-[var(--mr-bd2)] bg-[var(--mr-muted)]/40 first:border-t-0"
              />
            ))
          : settings.providers.map((provider) => (
              <div
                key={provider.id}
                className="grid grid-cols-[150px_1fr_150px_80px] items-center gap-3.5 border-t border-[var(--mr-bd2)] px-3.5 py-3 first:border-t-0"
              >
                <div>
                  <div className="text-[13px] font-medium">{provider.label}</div>
                  <div className="font-mono text-[10.5px] text-[var(--mr-mfg)]">
                    {provider.envKey}
                  </div>
                </div>
                <div className="glass flex h-8 min-w-0 items-center gap-2 rounded px-2.5">
                  <span className="truncate font-mono text-[11.5px] text-[var(--mr-fg2)]">
                    {provider.maskedKey}
                  </span>
                </div>
                <span className="text-xs text-[var(--mr-mfg)]">{provider.model}</span>
                <span
                  className={cn(
                    'inline-flex h-5 justify-self-end items-center rounded-full px-2 text-[10.5px] font-medium',
                    statusClasses(provider.status),
                  )}
                >
                  {statusLabel(provider.status)}
                </span>
              </div>
            ))}
      </div>
    </section>
  );
}
