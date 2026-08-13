import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { JobActivityStatus, KnowledgeBaseScope, SidebarAccent } from '@mintreels/schema';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/auth.types';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ApiOperation({ summary: 'List sidebar projects for the current user' })
  @ApiOkResponse({
    description: 'Compact project list for navigation',
    schema: {
      example: [
        { id: 1, name: 'Q3 Product Podcast', recordingCount: 34, accent: SidebarAccent.Mint },
      ],
    },
  })
  @Get('sidebar')
  listSidebar(@CurrentUser() user: RequestUser) {
    return this.projectsService.listSidebar(user.id);
  }

  @ApiOperation({ summary: 'List projects for the current user' })
  @ApiOkResponse({
    description: 'Project summaries with counts and job activity',
    schema: {
      example: [
        {
          id: 1,
          name: 'Q3 Product Podcast',
          updatedAt: '2026-08-13T08:00:00.000Z',
          recordingCount: 34,
          clipCount: 61,
          hookCount: 9,
          kbScope: KnowledgeBaseScope.Global,
          jobStatus: JobActivityStatus.Running,
          runningJobCount: 2,
          failedJobCount: 0,
        },
      ],
    },
  })
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.projectsService.list(user.id);
  }
}
