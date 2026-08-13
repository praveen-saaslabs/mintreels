import { cn } from '@/lib/utils';
import type { ClipFilterId } from '@/lib/data/types';
import { useClips } from '@/providers/clips-provider';

export function ClipFilters() {
  const { filters, activeFilterId, setActiveFilterId } = useClips();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => {
        const active = filter.id === activeFilterId;
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilterId(filter.id as ClipFilterId)}
            className={cn(
              'inline-flex h-7 items-center rounded-[9px] px-2.5 text-xs font-medium transition-colors',
              active
                ? 'bg-[var(--mr-muted)] text-[var(--mr-fg)]'
                : 'border border-[var(--mr-bd)] bg-transparent text-[var(--mr-mfg)] hover:text-[var(--mr-fg)]',
            )}
          >
            {filter.label}
          </button>
        );
      })}
      <span className="ml-auto font-mono text-[11px] text-[var(--mr-mfg)]">sort: newest</span>
    </div>
  );
}
