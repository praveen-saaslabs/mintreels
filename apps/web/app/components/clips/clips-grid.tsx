import { useMemo } from 'react';
import { formatClipCaption, formatClipProjectLabel } from '@/lib/data/format';
import type { ClipFilterId, ClipSummary } from '@/lib/data/types';
import { useClipsQuery } from '@/hooks/use-home-queries';
import { ClipCard } from './clip-card';

function matchesFilter(clip: ClipSummary, filterId: ClipFilterId): boolean {
  switch (filterId) {
    case 'all':
      return true;
    case 'queued':
      return clip.status === 'queued';
    case 'rendering':
      return clip.status === 'rendering';
    case 'ready':
      return clip.status === 'ready';
    case 'failed':
      return clip.status === 'failed';
    default:
      return true;
  }
}

export function ClipsGrid({
  searchQuery,
  activeFilterId,
}: {
  searchQuery: string;
  activeFilterId: ClipFilterId;
}) {
  const { data: clips = [], isLoading, error, refetch } = useClipsQuery();

  const filteredClips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return clips.filter((clip) => {
      if (!matchesFilter(clip, activeFilterId)) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        clip.title.toLowerCase().includes(q) ||
        formatClipCaption(clip).toLowerCase().includes(q) ||
        formatClipProjectLabel(clip).toLowerCase().includes(q)
      );
    });
  }, [clips, activeFilterId, searchQuery]);

  if (error) {
    return (
      <div className="space-y-3 glass rounded border-[color-mix(in_oklch,var(--mr-bad)_40%,transparent)] p-4 text-sm text-[var(--mr-bad)]">
        <p>{error instanceof Error ? error.message : 'Failed to load clips'}</p>
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] items-stretch gap-5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="glass h-[280px] animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (filteredClips.length === 0) {
    return (
      <div className="glass rounded p-6 text-sm text-[var(--mr-mfg)]">
        No clips match this filter.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] items-stretch gap-5">
      {filteredClips.map((clip) => (
        <ClipCard key={clip.id} clip={clip} />
      ))}
    </div>
  );
}
