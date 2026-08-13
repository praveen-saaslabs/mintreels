import { useMemo } from 'react';
import { formatClipCaption, formatClipProjectLabel, isClipSubtitled } from '@/lib/data/format';
import type { ClipFilterId, ClipSummary } from '@/lib/data/types';
import { useClipsQuery } from '@/hooks/use-home-queries';
import { ClipCard } from './clip-card';

function matchesFilter(clip: ClipSummary, filterId: ClipFilterId): boolean {
  switch (filterId) {
    case 'all':
      return true;
    case 'ready':
      return clip.status === 'ready';
    case 'rendering':
      return clip.status === 'rendering' || clip.status === 'queued';
    case 'failed':
      return clip.status === 'failed';
    case 'ratio_9_16':
      return clip.ratio === '9:16';
    case 'subtitled':
      return isClipSubtitled(clip);
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
      <div className="space-y-3 rounded-[14px] border border-[var(--mr-bad)]/40 bg-[var(--mr-card)] p-4 text-sm text-[var(--mr-bad)]">
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
