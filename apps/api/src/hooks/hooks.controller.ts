import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { HooksService } from './hooks.service';

@ApiTags('Hooks')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/recordings')
export class HooksController {
  constructor(private readonly hooksService: HooksService) {}

  @ApiOperation({ summary: 'List all hooks for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Array of hook objects' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Get(':id/hooks')
  listByRecordingId(@Param('id', ParseIntPipe) id: number) {
    return this.hooksService.listByRecordingId(id);
  }

  @ApiOperation({ summary: 'Trigger AI hook generation for a recording' })
  @ApiParam({ name: 'id', type: Number })
  @ApiAcceptedResponse({ description: 'Hook generation job enqueued' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Post(':id/hooks/generate')
  generate(@Param('id', ParseIntPipe) id: number) {
    return this.hooksService.generate(id);
  }
}
