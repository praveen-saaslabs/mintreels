import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { RenderSetting } from '@/lib/data/types';
import { useSettingsQuery } from '@/hooks/use-home-queries';

export function RenderDefaults() {
  const { data: settings, isLoading } = useSettingsQuery();
  const [renderDefaults, setRenderDefaults] = useState<RenderSetting[]>([]);

  useEffect(() => {
    if (settings?.renderDefaults) {
      setRenderDefaults(settings.renderDefaults);
    }
  }, [settings?.renderDefaults]);

  function setChoice(settingId: string, optionId: string) {
    setRenderDefaults((rows) =>
      rows.map((row) =>
        row.kind === 'choice' && row.id === settingId
          ? { ...row, selectedId: optionId }
          : row,
      ),
    );
  }

  function toggleSetting(settingId: string) {
    setRenderDefaults((rows) =>
      rows.map((row) =>
        row.kind === 'toggle' && row.id === settingId
          ? { ...row, enabled: !row.enabled }
          : row,
      ),
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="text-[11px] font-semibold tracking-[0.06em] text-[var(--mr-mfg)] uppercase">
        Render defaults
      </div>
      <div className="glass overflow-hidden rounded-2xl">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse border-t border-[var(--mr-bd2)] bg-[var(--mr-muted)]/40 first:border-t-0"
              />
            ))
          : renderDefaults.length === 0
            ? (
                <div className="px-3.5 py-4 text-sm text-[var(--mr-mfg)]">
                  No render defaults configured.
                </div>
              )
            : renderDefaults.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-[var(--mr-bd2)] px-3.5 py-3 first:border-t-0"
                >
                  <div>
                    <div className="text-[13px] font-medium">{row.label}</div>
                    <div className="mt-0.5 text-[11.5px] text-pretty text-[var(--mr-mfg)]">
                      {row.help}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {row.kind === 'choice' ? (
                      row.options.map((option) => {
                        const active = option.id === row.selectedId;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setChoice(row.id, option.id)}
                            className={cn(
                              'inline-flex h-7 items-center rounded-[9px] px-2.5 text-xs font-medium',
                              active
                                ? 'glass-strong text-[var(--mr-fg)]'
                                : 'glass-chip text-[var(--mr-mfg)] hover:text-[var(--mr-fg)]',
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={row.enabled}
                        onClick={() => toggleSetting(row.id)}
                        className={cn(
                          'flex h-[22px] w-[38px] items-center rounded-full p-0.5 transition-colors',
                          row.enabled
                            ? 'justify-end bg-[var(--mr-acc)]'
                            : 'justify-start bg-[var(--mr-muted)]',
                        )}
                      >
                        <span
                          className={cn(
                            'size-[18px] rounded-full',
                            row.enabled
                              ? 'bg-[var(--mr-accfg)]'
                              : 'bg-[var(--mr-mfg)]',
                          )}
                        />
                      </button>
                    )}
                  </div>
                </div>
              ))}
      </div>
    </section>
  );
}
