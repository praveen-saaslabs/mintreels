import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SettingsRepository } from '@/lib/data/settings-repository';
import type { RenderSetting, SettingsSnapshot } from '@/lib/data/types';

type SettingsContextValue = {
  settings: SettingsSnapshot | null;
  renderDefaults: RenderSetting[];
  setChoice: (settingId: string, optionId: string) => void;
  toggleSetting: (settingId: string) => void;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  repository,
  children,
}: {
  repository: SettingsRepository;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<SettingsSnapshot | null>(null);
  const [renderDefaults, setRenderDefaults] = useState<RenderSetting[]>([]);
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
        const next = await repository.getSettings();
        if (cancelled) {
          return;
        }
        setSettings(next);
        setRenderDefaults(next.renderDefaults);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load settings');
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

  const setChoice = useCallback((settingId: string, optionId: string) => {
    setRenderDefaults((rows) =>
      rows.map((row) =>
        row.kind === 'choice' && row.id === settingId
          ? { ...row, selectedId: optionId }
          : row,
      ),
    );
  }, []);

  const toggleSetting = useCallback((settingId: string) => {
    setRenderDefaults((rows) =>
      rows.map((row) =>
        row.kind === 'toggle' && row.id === settingId
          ? { ...row, enabled: !row.enabled }
          : row,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      settings,
      renderDefaults,
      setChoice,
      toggleSetting,
      isLoading,
      error,
      reload,
    }),
    [settings, renderDefaults, setChoice, toggleSetting, isLoading, error, reload],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
