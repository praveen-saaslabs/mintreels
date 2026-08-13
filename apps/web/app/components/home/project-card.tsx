import { Trash2 } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { buttonVariants } from '@/components/ui/button';
import { useDeleteProject } from '@/hooks/use-delete-project';
import { cn } from '@/lib/utils';
import {
  formatKbLabel,
  formatProjectJobText,
  formatRelativeUpdatedAt,
} from '@/lib/data/format';
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
  const jobText = formatProjectJobText(project);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { deleteProject, isDeleting, errorMessage, reset } = useDeleteProject();

  function onDeleteClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    reset();
    setConfirmOpen(true);
  }

  return (
    <>
      <Link
        to={`/editor/${String(project.id)}`}
        className="glass relative block overflow-hidden rounded-lg text-inherit transition-[border-color,box-shadow] hover:border-[var(--mr-acc)] hover:shadow-[var(--glass-shadow-elevated)]"
      >
        <div className="relative flex h-[118px] items-end bg-[repeating-linear-gradient(135deg,var(--mr-stripe3)_0_10px,var(--mr-stripe4)_10px_20px)] p-3">
          <span
            className={cn(
              'glass-chip inline-flex h-[21px] items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-medium',
              jobTone(project.jobStatus),
            )}
          >
            <span
              className={cn(
                'size-[5px] rounded-full bg-current',
                project.jobStatus === 'running' && 'animate-mr-pulse',
              )}
            />
            {jobText}
          </span>
          <button
            type="button"
            aria-label={`Delete project ${project.name}`}
            onClick={onDeleteClick}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
              'absolute top-2 right-2 z-10 text-[var(--mr-onstripe)] hover:text-[var(--mr-bad)]',
            )}
          >
            <Trash2 />
          </button>
        </div>
        <div className="flex flex-col gap-2.5 p-3.5">
          <div>
            <div className="text-[15px] leading-snug font-semibold tracking-[-0.01em]">
              {project.name}
            </div>
            <div className="mt-1 text-xs text-[var(--mr-mfg)]">
              {formatRelativeUpdatedAt(project.updatedAt)}
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <div className="font-mono text-[15px] font-medium">{project.recordingCount}</div>
              <div className="text-[10.5px] text-[var(--mr-mfg)]">recordings</div>
            </div>
            <div>
              <div className="font-mono text-[15px] font-medium">{project.clipCount}</div>
              <div className="text-[10.5px] text-[var(--mr-mfg)]">clips</div>
            </div>
            <div>
              <div className="font-mono text-[15px] font-medium text-[var(--mr-acc)]">
                {project.hookCount}
              </div>
              <div className="text-[10.5px] text-[var(--mr-mfg)]">open hooks</div>
            </div>
          </div>
          <div className="text-[11px] text-[var(--mr-mfg)]">{formatKbLabel(project.kbScope)}</div>
        </div>
      </Link>
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${project.name}?`}
        description="This deletes all recordings and clips in this project. This cannot be undone."
        pending={isDeleting}
        errorMessage={errorMessage}
        onConfirm={async () => {
          await deleteProject(project.id);
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
