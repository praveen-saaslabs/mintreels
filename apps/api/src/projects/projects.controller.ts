import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IdentityGuard } from '../guest/identity.guard';
import { GuestRateLimitGuard } from '../guest/guest-rate-limit.guard';
import { JobActivityStatus, KnowledgeBaseScope, SidebarAccent } from '@mintreels/schema';
import { CurrentActor } from '../guest/current-actor.decorator';
import { ownership, type RequestActor } from '../auth/auth.types';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(IdentityGuard, GuestRateLimitGuard)
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
  listSidebar(@CurrentActor() actor: RequestActor) {
    return this.projectsService.listSidebar(ownership(actor));
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
          thumbnailUrl: 'https://cdn.filestackcontent.com/THUMB',
        },
      ],
    },
  })
  @Get()
  list(@CurrentActor() actor: RequestActor) {
    return this.projectsService.list(ownership(actor));
  }

  @ApiOperation({
    summary: 'Soft-delete a project and cascade-soft-delete recordings, clips, and knowledge metadata',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Project deleted' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.projectsService.remove(id, ownership(actor));
  }
}
