import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ProjectSummary } from '@/lib/data/types';

function jobTone(status: ProjectSummary['jobStatus']) {
  switch (status) {
    case 'running':
      return 'text-[var(--mr-warn)]';
    case 'failed':
      return 'text-[var(--mr-bad)]';
    default:
      return 'text-[var(--mr-onstripe)]';
  }
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      to="/recordings"
      className="block overflow-hidden rounded-[15px] border border-[var(--mr-bd)] bg-[var(--mr-card)] text-inherit transition-colors hover:border-[var(--mr-acc)]"
    >
      <div className="relative flex h-[118px] items-end bg-[repeating-linear-gradient(135deg,var(--mr-stripe3)_0_10px,var(--mr-stripe4)_10px_20px)] p-3">
        <span
          className={cn(
            'inline-flex h-[21px] items-center gap-1.5 rounded-full bg-[var(--mr-pill)] px-2.5 text-[10.5px] font-medium',
            jobTone(project.jobStatus),
          )}
        >
          <span
            className={cn(
              'size-[5px] rounded-full bg-current',
              project.jobStatus === 'running' && 'animate-mr-pulse',
            )}
          />
          {project.jobText}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 p-3.5">
        <div>
          <div className="text-[15px] leading-snug font-semibold tracking-[-0.01em]">
            {project.name}
          </div>
          <div className="mt-1 text-xs text-[var(--mr-mfg)]">{project.updatedLabel}</div>
        </div>
        <div className="flex gap-4">
          <div>
            <div className="font-mono text-[15px] font-medium">{project.recordings}</div>
            <div className="text-[10.5px] text-[var(--mr-mfg)]">recordings</div>
          </div>
          <div>
            <div className="font-mono text-[15px] font-medium">{project.clips}</div>
            <div className="text-[10.5px] text-[var(--mr-mfg)]">clips</div>
          </div>
          <div>
            <div className="font-mono text-[15px] font-medium text-[var(--mr-acc)]">
              {project.hooks}
            </div>
            <div className="text-[10.5px] text-[var(--mr-mfg)]">open hooks</div>
          </div>
        </div>
        <div className="text-[11px] text-[var(--mr-mfg)]">{project.kbLabel}</div>
      </div>
    </Link>
  );
}
