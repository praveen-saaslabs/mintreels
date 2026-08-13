import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ClipsRepository } from '@/lib/data/clips-repository';
import type { ClipFilter, ClipFilterId, ClipSummary } from '@/lib/data/types';

type ClipsContextValue = {
  filters: ClipFilter[];
  clips: ClipSummary[];
  activeFilterId: ClipFilterId;
  setActiveFilterId: (id: ClipFilterId) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredClips: ClipSummary[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

const ClipsContext = createContext<ClipsContextValue | null>(null);

function matchesFilter(clip: ClipSummary, filterId: ClipFilterId): boolean {
  switch (filterId) {
    case 'all':
      return true;
    case 'ready':
      return clip.status === 'ready';
    case 'rendering':
      return clip.status === 'rendering' || clip.status === 'queued';
    case 'failed':
      return clip.status === 'failed';
    case 'ratio_9_16':
      return clip.ratio === '9:16';
    case 'subtitled':
      return clip.subtitled;
    default:
      return true;
  }
}

export function ClipsProvider({
  repository,
  children,
}: {
  repository: ClipsRepository;
  children: ReactNode;
}) {
  const [filters, setFilters] = useState<ClipFilter[]>([]);
  const [clips, setClips] = useState<ClipSummary[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<ClipFilterId>('all');
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
        const [nextFilters, nextClips] = await Promise.all([
          repository.listFilters(),
          repository.listClips(),
        ]);
        if (cancelled) {
          return;
        }
        setFilters(nextFilters);
        setClips(nextClips);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load clips');
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
        clip.caption.toLowerCase().includes(q) ||
        clip.projectLabel.toLowerCase().includes(q)
      );
    });
  }, [clips, activeFilterId, searchQuery]);

  const value = useMemo(
    () => ({
      filters,
      clips,
      activeFilterId,
      setActiveFilterId,
      searchQuery,
      setSearchQuery,
      filteredClips,
      isLoading,
      error,
      reload,
    }),
    [
      filters,
      clips,
      activeFilterId,
      searchQuery,
      filteredClips,
      isLoading,
      error,
      reload,
    ],
  );

  return <ClipsContext.Provider value={value}>{children}</ClipsContext.Provider>;
}

export function useClips() {
  const ctx = useContext(ClipsContext);
  if (!ctx) {
    throw new Error('useClips must be used within ClipsProvider');
  }
  return ctx;
}
