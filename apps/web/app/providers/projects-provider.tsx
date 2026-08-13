import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ProjectsRepository } from '@/lib/data/projects-repository';
import type {
  ProjectSummary,
  SidebarProject,
  WorkspaceStats,
  WorkspaceUser,
} from '@/lib/data/types';

type ProjectsContextValue = {
  user: WorkspaceUser | null;
  stats: WorkspaceStats | null;
  projects: ProjectSummary[];
  sidebarProjects: SidebarProject[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredProjects: ProjectSummary[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({
  repository,
  children,
}: {
  repository: ProjectsRepository;
  children: ReactNode;
}) {
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [sidebarProjects, setSidebarProjects] = useState<SidebarProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [nextUser, nextStats, nextProjects, nextSidebar] = await Promise.all([
          repository.getWorkspaceUser(),
          repository.getWorkspaceStats(),
          repository.listProjects(),
          repository.listSidebarProjects(),
        ]);
        if (cancelled) {
          return;
        }
        setUser(nextUser);
        setStats(nextStats);
        setProjects(nextProjects);
        setSidebarProjects(nextSidebar);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [repository, reloadToken]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return projects;
    }
    return projects.filter((project) => project.name.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  const value = useMemo(
    () => ({
      user,
      stats,
      projects,
      sidebarProjects,
      searchQuery,
      setSearchQuery,
      filteredProjects,
      isLoading,
      error,
      reload,
    }),
    [
      user,
      stats,
      projects,
      sidebarProjects,
      searchQuery,
      filteredProjects,
      isLoading,
      error,
      reload,
    ],
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error('useProjects must be used within ProjectsProvider');
  }
  return ctx;
}
