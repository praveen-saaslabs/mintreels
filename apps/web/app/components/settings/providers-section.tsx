import { cn } from '@/lib/utils';
import type { ProviderRow } from '@/lib/data/types';
import { useSettings } from '@/providers/settings-provider';

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
  const { settings, isLoading, error } = useSettings();

  if (error) {
    return (
      <div className="rounded-[14px] border border-[var(--mr-bad)]/40 bg-[var(--mr-card)] p-4 text-sm text-[var(--mr-bad)]">
        {error}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="text-[11px] font-semibold tracking-[0.06em] text-[var(--mr-mfg)] uppercase">
        Providers
      </div>
      <div className="overflow-hidden rounded-[14px] border border-[var(--mr-bd)] bg-[var(--mr-card)]">
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
                <div className="flex h-8 min-w-0 items-center gap-2 rounded-[9px] border border-[var(--mr-bd)] bg-[var(--mr-bg)] px-2.5">
                  <span className="truncate font-mono text-[11.5px] text-[var(--mr-fg2)]">
                    {provider.maskedKey}
                  </span>
                  <span className="ml-auto shrink-0 text-[10.5px] text-[var(--mr-mfg)]">
                    reveal
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
