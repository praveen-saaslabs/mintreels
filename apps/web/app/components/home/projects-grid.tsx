import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useProjectsQuery } from '@/hooks/use-home-queries';
import { ProjectCard } from './project-card';

export function ProjectsGrid({ searchQuery }: { searchQuery: string }) {
  const { data: projects = [], isLoading, error, refetch } = useProjectsQuery();

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return projects;
    }
    return projects.filter((project) => project.name.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  if (error) {
    return (
      <div className="space-y-3 rounded-[14px] border border-[var(--mr-bad)]/40 bg-[var(--mr-card)] p-4 text-sm text-[var(--mr-bad)]">
        <p>{error instanceof Error ? error.message : 'Failed to load projects'}</p>
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

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {isLoading
        ? Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[260px] animate-pulse rounded-[15px] border border-[var(--mr-bd)] bg-[var(--mr-card)]"
            />
          ))
        : filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}

      <Link
        to="/editor/new"
        className="flex min-h-[200px] items-center justify-center gap-2 rounded-[15px] border border-dashed border-[var(--mr-bd)] bg-transparent text-[13px] font-medium text-[var(--mr-mfg)] hover:border-[var(--mr-acc)] hover:text-[var(--mr-fg)]"
      >
        <Plus className="size-4" />
        New project
      </Link>
    </div>
  );
}
