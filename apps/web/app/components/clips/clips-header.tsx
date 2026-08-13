import { Search } from 'lucide-react';
import { useClips } from '@/providers/clips-provider';
import { useProjects } from '@/providers/projects-provider';

export function ClipsHeader() {
  const { clips, searchQuery, setSearchQuery } = useClips();
  const { stats } = useProjects();

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
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search clips, captions, transcript"
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[var(--mr-fg)] outline-none placeholder:text-[var(--mr-mfg)]"
        />
      </label>
    </div>
  );
}
