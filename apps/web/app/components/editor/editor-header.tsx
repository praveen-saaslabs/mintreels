import { ArrowLeft, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { buttonVariants } from '@/components/ui/button';
import { useDeleteProject } from '@/hooks/use-delete-project';
import { cn } from '@/lib/utils';

export function EditorHeader({
  title,
  projectId,
}: Readonly<{ title: string; projectId?: number | undefined }>) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { deleteProject, isDeleting, errorMessage, reset } = useDeleteProject({
    onSuccess: () => {
      navigate('/');
    },
  });

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 px-4 border border-b-[var(--glass-border-subtle)]">
      <Link
        to="/"
        className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>
      <span className="text-muted-foreground/60" aria-hidden>
        |
      </span>
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h1>
      {projectId != null ? (
        <>
          <button
            type="button"
            aria-label={`Delete project ${title}`}
            onClick={() => {
              reset();
              setConfirmOpen(true);
            }}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
              'shrink-0 text-muted-foreground hover:text-[var(--mr-bad)]',
            )}
          >
            <Trash2 />
          </button>
          <ConfirmDeleteDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={`Delete ${title}?`}
            description="This deletes all recordings and clips in this project. This cannot be undone."
            pending={isDeleting}
            errorMessage={errorMessage}
            onConfirm={async () => {
              await deleteProject(projectId);
            }}
          />
        </>
      ) : null}
    </header>
  );
}
