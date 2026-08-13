import { api } from '@/lib/api';
import { mockSettingsSnapshot } from './mocks/home-mocks';
import type { SettingsSnapshot } from './types';

export type SettingsRepository = {
  getSettings(): Promise<SettingsSnapshot>;
};

export function createMockSettingsRepository(): SettingsRepository {
  return {
    async getSettings() {
      return mockSettingsSnapshot;
    },
  };
}

export function createApiSettingsRepository(): SettingsRepository {
  return {
    getSettings: () => api.getSettings(),
  };
}

export function createSettingsRepository(useMock: boolean): SettingsRepository {
  return useMock ? createMockSettingsRepository() : createApiSettingsRepository();
}
