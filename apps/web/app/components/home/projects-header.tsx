import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspaceStatsQuery } from '@/hooks/use-home-queries';

export function ProjectsHeader({
  searchQuery,
  onSearchQueryChange,
}: {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}) {
  const { data: stats } = useWorkspaceStatsQuery();

  const subtitle = stats
    ? `${stats.projectCount} projects · ${stats.recordingCount} recordings · ${stats.clipCount} clips`
    : 'Loading workspace…';

  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em]">Projects</h1>
        <p className="mt-1.5 mb-0 text-[13px] text-[var(--mr-mfg)]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex h-[34px] w-[260px] items-center gap-2 rounded-[10px] border border-[var(--mr-bd)] bg-[var(--mr-card)] px-2.5">
          <Search className="size-3.5 text-[var(--mr-mfg)]" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search projects"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[var(--mr-fg)] outline-none placeholder:text-[var(--mr-mfg)]"
          />
          <span className="font-mono text-[10px] text-[var(--mr-mfg)]">⌘K</span>
        </label>
        <Link
          to="/editor/new"
          className="inline-flex h-[34px] items-center rounded-[10px] bg-[var(--mr-acc)] px-3.5 text-[13px] font-semibold text-[var(--mr-accfg)]"
        >
          New project
        </Link>
      </div>
    </div>
  );
}
