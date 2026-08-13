import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';

export function RenderDefaults() {
  const { renderDefaults, setChoice, toggleSetting, isLoading } = useSettings();

  return (
    <section className="flex flex-col gap-3">
      <div className="text-[11px] font-semibold tracking-[0.06em] text-[var(--mr-mfg)] uppercase">
        Render defaults
      </div>
      <div className="overflow-hidden rounded-[14px] border border-[var(--mr-bd)] bg-[var(--mr-card)]">
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse border-t border-[var(--mr-bd2)] bg-[var(--mr-muted)]/40 first:border-t-0"
              />
            ))
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
                              ? 'bg-[var(--mr-muted)] text-[var(--mr-fg)]'
                              : 'border border-[var(--mr-bd)] text-[var(--mr-mfg)]',
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
