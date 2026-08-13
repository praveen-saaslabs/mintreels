import { Search } from 'lucide-react';
import { useClipsQuery, useWorkspaceStatsQuery } from '@/hooks/use-home-queries';

export function ClipsHeader({
  searchQuery,
  onSearchQueryChange,
}: {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}) {
  const { data: clips = [] } = useClipsQuery();
  const { data: stats } = useWorkspaceStatsQuery();

  const subtitle = stats
    ? `${stats.clipCount} clips across ${stats.projectCount} projects`
    : `${clips.length} clips`;

  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em]">All clips</h1>
        <p className="mt-1.5 mb-0 text-[13px] text-[var(--mr-mfg)]">{subtitle}</p>
      </div>
      <label className="flex h-[34px] w-[300px] items-center gap-2 rounded-[10px] border border-[var(--mr-bd)] bg-[var(--mr-card)] px-2.5">
        <Search className="size-3.5 text-[var(--mr-mfg)]" />
        <input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search clips, captions, transcript"
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[var(--mr-fg)] outline-none placeholder:text-[var(--mr-mfg)]"
        />
      </label>
    </div>
  );
}
