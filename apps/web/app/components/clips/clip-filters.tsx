import { cn } from '@/lib/utils';
import { formatClipFilterLabel } from '@/lib/data/format';
import type { ClipFilterId } from '@/lib/data/types';
import { useClipFiltersQuery } from '@/hooks/use-home-queries';

export function ClipFilters({
  activeFilterId,
  onActiveFilterIdChange,
}: {
  activeFilterId: ClipFilterId;
  onActiveFilterIdChange: (id: ClipFilterId) => void;
}) {
  const { data: filters = [] } = useClipFiltersQuery();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => {
        const active = filter.id === activeFilterId;
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onActiveFilterIdChange(filter.id)}
            className={cn(
              'inline-flex h-7 items-center rounded-xl px-2.5 text-xs font-medium transition-colors',
              active
                ? 'glass-strong text-[var(--mr-fg)]'
                : 'glass-chip text-[var(--mr-mfg)] hover:text-[var(--mr-fg)]',
            )}
          >
            {formatClipFilterLabel(filter.label, filter.count)}
          </button>
        );
      })}
      <span className="ml-auto font-mono text-[11px] text-[var(--mr-mfg)]">sort: newest</span>
    </div>
  );
}
