import { useMemo, type ReactNode } from 'react';
import { createClipsRepository } from '@/lib/data/clips-repository';
import { createProjectsRepository } from '@/lib/data/projects-repository';
import { createSettingsRepository } from '@/lib/data/settings-repository';
import { ClipsProvider } from './clips-provider';
import { ProjectsProvider } from './projects-provider';
import { SettingsProvider } from './settings-provider';
import { ThemeProvider } from './theme-provider';

function useMockData(): boolean {
  return import.meta.env.VITE_USE_MOCK_DATA !== 'false';
}

export function AppProviders({ children }: { children: ReactNode }) {
  const useMock = useMockData();

  const projectsRepository = useMemo(() => createProjectsRepository(useMock), [useMock]);
  const clipsRepository = useMemo(() => createClipsRepository(useMock), [useMock]);
  const settingsRepository = useMemo(() => createSettingsRepository(useMock), [useMock]);

  return (
    <ThemeProvider>
      <ProjectsProvider repository={projectsRepository}>
        <ClipsProvider repository={clipsRepository}>
          <SettingsProvider repository={settingsRepository}>{children}</SettingsProvider>
        </ClipsProvider>
      </ProjectsProvider>
    </ThemeProvider>
  );
}
