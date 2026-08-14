import { useMemo } from 'react';
import { Clapperboard } from 'lucide-react';
import { Link } from 'react-router-dom';
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
      <div className="space-y-3 glass rounded-md border-[color-mix(in_oklch,var(--mr-bad)_40%,transparent)] p-4 text-sm text-[var(--mr-bad)]">
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
          <div key={index} className="glass h-[280px] animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (filteredClips.length === 0) {
    if (clips.length === 0) {
      return (
        <div className="glass flex flex-col items-center justify-center gap-3 rounded-md px-6 py-14 text-center">
          <div className="glass-chip flex size-11 items-center justify-center rounded-md text-[var(--mr-mfg)]">
            <Clapperboard className="size-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="m-0 text-sm font-medium text-[var(--mr-fg)]">No clips yet</p>
            <p className="m-0 max-w-sm text-[13px] text-[var(--mr-mfg)]">
              Cut a clip from a project in the editor to see it here.
            </p>
          </div>
          <Link
            to="/editor/new"
            className="inline-flex h-8 items-center rounded-md bg-[var(--mr-acc)] px-3.5 text-[13px] font-semibold text-[var(--mr-accfg)]"
          >
            New project
          </Link>
        </div>
      );
    }

    const hasSearch = searchQuery.trim().length > 0;
    const hasFilter = activeFilterId !== 'all';
    let hint = 'Try another filter.';
    if (hasSearch && hasFilter) {
      hint = 'Clear your search or switch filters.';
    } else if (hasSearch) {
      hint = 'Try a different search.';
    }

    return (
      <div className="glass flex flex-col items-center justify-center gap-2 rounded-md px-6 py-12 text-center">
        <p className="m-0 text-sm font-medium text-[var(--mr-fg)]">No clips match</p>
        <p className="m-0 text-[13px] text-[var(--mr-mfg)]">{hint}</p>
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
