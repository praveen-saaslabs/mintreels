import { Injectable } from '@nestjs/common';
import {
  ClipRepository,
  HookRepository,
  JobRepository,
  KnowledgeBaseRepository,
  KnowledgeDocumentRepository,
  ProjectRepository,
  RecordingRepository,
} from '@mintreels/db';
import { JobActivityStatus, JobStatus, SidebarAccent } from '@mintreels/schema';
import type { KnowledgeBaseScope } from '@mintreels/schema';
import { HttpError } from '../common/http-error';
import { RecordingsService } from '../recordings/recordings.service';

type ProjectSummaryRow = {
  id: number;
  name: string;
  updatedAt: Date;
  recordingCount: number;
  clipCount: number;
  hookCount: number;
  kbScope: KnowledgeBaseScope | null;
  runningJobCount: number;
  failedJobCount: number;
};

function increment(map: Map<number, number>, key: number): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function jobActivity(running: number, failed: number): JobActivityStatus {
  if (running > 0) {
    return JobActivityStatus.Running;
  }
  if (failed > 0) {
    return JobActivityStatus.Failed;
  }
  return JobActivityStatus.Idle;
}

function accent(running: number, failed: number): SidebarAccent {
  if (failed > 0) {
    return SidebarAccent.Warn;
  }
  if (running > 0) {
    return SidebarAccent.Mint;
  }
  return SidebarAccent.Muted;
}

function toProjectSummary(row: ProjectSummaryRow) {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt,
    recordingCount: row.recordingCount,
    clipCount: row.clipCount,
    hookCount: row.hookCount,
    kbScope: row.kbScope,
    jobStatus: jobActivity(row.runningJobCount, row.failedJobCount),
    runningJobCount: row.runningJobCount,
    failedJobCount: row.failedJobCount,
  };
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly recordings: RecordingRepository,
    private readonly clips: ClipRepository,
    private readonly hooks: HookRepository,
    private readonly knowledgeBases: KnowledgeBaseRepository,
    private readonly knowledgeDocuments: KnowledgeDocumentRepository,
    private readonly jobs: JobRepository,
    private readonly recordingsService: RecordingsService,
  ) {}

  async list(userId: number) {
    const rows = await this.listSummaries(userId);
    return rows.map(toProjectSummary);
  }

  async listSidebar(userId: number) {
    const rows = await this.listSummaries(userId);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      recordingCount: row.recordingCount,
      accent: accent(row.runningJobCount, row.failedJobCount),
    }));
  }

  async remove(id: number, userId: number): Promise<void> {
    const project = await this.projects.findByIdForUser(id, userId);
    if (!project) {
      throw new HttpError(404, 'Not found');
    }

    const recordings = await this.recordings.listByProjectIds([project.id]);
    for (const recording of recordings) {
      await this.recordingsService.remove(recording.id, userId);
    }

    const knowledgeBases = await this.knowledgeBases.find({ where: { projectId: project.id } });
    for (const knowledgeBase of knowledgeBases) {
      await this.knowledgeDocuments.softDelete({ knowledgeBaseId: knowledgeBase.id });
    }
    await this.knowledgeBases.softDelete({ projectId: project.id });
    await this.projects.softRemove(project);
  }

  private async listSummaries(userId: number): Promise<ProjectSummaryRow[]> {
    const projects = await this.projects.listForUser(userId);
    if (projects.length === 0) {
      return [];
    }

    const projectIds = projects.map((project) => project.id);
    const recordings = await this.recordings.listByProjectIds(projectIds);
    const recordingIds = recordings.map((recording) => recording.id);
    const recordingProject = new Map(
      recordings.map((recording) => [recording.id, recording.projectId]),
    );

    const [clips, hooks, knowledgeBases, jobs] = await Promise.all([
      this.clips.listByRecordingIds(recordingIds),
      this.hooks.listByRecordingIds(recordingIds),
      this.knowledgeBases.listGlobalByProjectIds(projectIds),
      this.jobs.listByRecordingIds(recordingIds, [JobStatus.Running, JobStatus.Failed]),
    ]);

    const recordingCountByProject = new Map<number, number>();
    for (const recording of recordings) {
      increment(recordingCountByProject, recording.projectId);
    }

    const clipCountByProject = new Map<number, number>();
    for (const clip of clips) {
      const projectId = recordingProject.get(clip.recordingId);
      if (projectId != null) {
        increment(clipCountByProject, projectId);
      }
    }

    const hookCountByProject = new Map<number, number>();
    for (const hook of hooks) {
      const projectId = recordingProject.get(hook.recordingId);
      if (projectId != null) {
        increment(hookCountByProject, projectId);
      }
    }

    const kbScopeByProject = new Map<number, KnowledgeBaseScope>();
    for (const knowledgeBase of knowledgeBases) {
      kbScopeByProject.set(knowledgeBase.projectId, knowledgeBase.scope);
    }

    const runningJobCountByProject = new Map<number, number>();
    const failedJobCountByProject = new Map<number, number>();
    for (const job of jobs) {
      if (job.recordingId == null) {
        continue;
      }
      const projectId = recordingProject.get(job.recordingId);
      if (projectId == null) {
        continue;
      }
      if (job.status === JobStatus.Running) {
        increment(runningJobCountByProject, projectId);
      } else if (job.status === JobStatus.Failed) {
        increment(failedJobCountByProject, projectId);
      }
    }

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt,
      recordingCount: recordingCountByProject.get(project.id) ?? 0,
      clipCount: clipCountByProject.get(project.id) ?? 0,
      hookCount: hookCountByProject.get(project.id) ?? 0,
      kbScope: kbScopeByProject.get(project.id) ?? null,
      runningJobCount: runningJobCountByProject.get(project.id) ?? 0,
      failedJobCount: failedJobCountByProject.get(project.id) ?? 0,
    }));
  }
}
