import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProjects } from '@/providers/projects-provider';
import type { SidebarProject } from '@/lib/data/types';

function accentClass(accent: SidebarProject['accent']) {
  switch (accent) {
    case 'mint':
      return 'bg-[var(--mr-acc)]';
    case 'warn':
      return 'bg-[var(--mr-warn)]';
    default:
      return 'bg-[var(--mr-mfg)]';
  }
}

export function ProjectListNav() {
  const { sidebarProjects, isLoading } = useProjects();

  return (
    <div className="flex flex-none flex-col gap-2 px-3.5 pb-2.5 pt-2">
      <div className="text-[10.5px] font-semibold tracking-[0.07em] text-[var(--mr-mfg)] uppercase">
        Projects
      </div>
      <div className="flex flex-col gap-0.5">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-7 animate-pulse rounded-md bg-[var(--mr-muted)]"
              />
            ))
          : sidebarProjects.map((project) => (
              <Link
                key={project.id}
                to="/recordings"
                className="flex h-7 items-center gap-2 px-1 text-[12.5px] text-[var(--mr-fg2)] hover:text-[var(--mr-fg)]"
              >
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-[2px]',
                    accentClass(project.accent),
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
                <span className="font-mono text-[10.5px] text-[var(--mr-mfg)]">
                  {project.recordingCount}
                </span>
              </Link>
            ))}
      </div>
    </div>
  );
}
