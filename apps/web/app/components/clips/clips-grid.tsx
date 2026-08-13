import { useClips } from '@/providers/clips-provider';
import { ClipCard } from './clip-card';

export function ClipsGrid() {
  const { filteredClips, isLoading, error } = useClips();

  if (error) {
    return (
      <div className="rounded-[14px] border border-[var(--mr-bad)]/40 bg-[var(--mr-card)] p-4 text-sm text-[var(--mr-bad)]">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3.5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-[320px] animate-pulse rounded-[14px] border border-[var(--mr-bd)] bg-[var(--mr-card)]"
          />
        ))}
      </div>
    );
  }

  if (filteredClips.length === 0) {
    return (
      <div className="rounded-[14px] border border-[var(--mr-bd)] bg-[var(--mr-card)] p-6 text-sm text-[var(--mr-mfg)]">
        No clips match this filter.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3.5">
      {filteredClips.map((clip) => (
        <ClipCard key={clip.id} clip={clip} />
      ))}
    </div>
  );
}
