import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/auth.types';
import { WorkspaceService } from './workspace.service';

@ApiTags('Workspace')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @ApiOperation({ summary: 'Get the current workspace user' })
  @ApiOkResponse({
    description: 'Display name, initials, and subtitle',
    schema: {
      example: { displayName: 'Ada Lovelace', initials: 'AL', subtitle: 'ada@example.com' },
    },
  })
  @Get('user')
  getUser(@CurrentUser() user: RequestUser) {
    return this.workspaceService.getUser(user.id);
  }

  @ApiOperation({ summary: 'Get workspace counts for the current user' })
  @ApiOkResponse({
    description: 'Project, recording, and clip counts',
    schema: { example: { projectCount: 4, recordingCount: 71, clipCount: 128 } },
  })
  @Get('stats')
  getStats(@CurrentUser() user: RequestUser) {
    return this.workspaceService.getStats(user.id);
  }
}
