import { api } from '@/lib/api';
import {
  mockProjects,
  mockSidebarProjects,
  mockWorkspaceStats,
  mockWorkspaceUser,
} from './mocks/home-mocks';
import type { ProjectSummary, SidebarProject, WorkspaceStats, WorkspaceUser } from './types';

export type ProjectsRepository = {
  getWorkspaceUser(): Promise<WorkspaceUser>;
  getWorkspaceStats(): Promise<WorkspaceStats>;
  listProjects(): Promise<ProjectSummary[]>;
  listSidebarProjects(): Promise<SidebarProject[]>;
};

export function createMockProjectsRepository(): ProjectsRepository {
  return {
    async getWorkspaceUser() {
      return mockWorkspaceUser;
    },
    async getWorkspaceStats() {
      return mockWorkspaceStats;
    },
    async listProjects() {
      return mockProjects;
    },
    async listSidebarProjects() {
      return mockSidebarProjects;
    },
  };
}

export function createApiProjectsRepository(): ProjectsRepository {
  return {
    getWorkspaceUser: () => api.getWorkspaceUser(),
    getWorkspaceStats: () => api.getWorkspaceStats(),
    listProjects: () => api.getProjects(),
    listSidebarProjects: () => api.getSidebarProjects(),
  };
}

export function createProjectsRepository(useMock: boolean): ProjectsRepository {
  return useMock ? createMockProjectsRepository() : createApiProjectsRepository();
}
