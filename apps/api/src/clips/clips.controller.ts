import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CLIP_FILTER_LABELS, ClipFilterId, ClipRatio, ClipStatus } from '@mintreels/schema';
import { createClipRequestSchema, type CreateClipRequest } from './clips.dto';
import { ClipsService } from './clips.service';

const clipExample = {
  id: 1,
  title: 'The roadmap was never a plan',
  recordingId: 10,
  hookId: 4,
  projectId: 2,
  projectName: 'Q3 Product Podcast',
  recordingTitle: 'Ep. 14',
  startMs: 252000,
  endMs: 293000,
  status: ClipStatus.Ready,
  subtitleStyle: 'bold_mint',
  videoUrl: 'https://cdn.filestackcontent.com/HANDLE',
  thumbnailUrl: 'https://cdn.filestackcontent.com/THUMB',
  ratio: ClipRatio.Vertical,
};

@ApiTags('Clips')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/clips')
export class ClipsController {
  constructor(private readonly clipsService: ClipsService) {}

  @ApiOperation({ summary: 'Create a clip from a recording segment' })
  @ApiCreatedResponse({ description: 'Clip created; render job enqueued' })
  @Post()
  create(@Body(new ZodValidationPipe(createClipRequestSchema)) body: CreateClipRequest) {
    return this.clipsService.create(body);
  }

  @ApiOperation({ summary: 'List clip filter counts for the current user' })
  @ApiOkResponse({
    description: 'Filter ids with labels and counts',
    schema: {
      example: [
        { id: ClipFilterId.All, label: CLIP_FILTER_LABELS[ClipFilterId.All], count: 128 },
        { id: ClipFilterId.Ready, label: CLIP_FILTER_LABELS[ClipFilterId.Ready], count: 119 },
        { id: ClipFilterId.Rendering, label: CLIP_FILTER_LABELS[ClipFilterId.Rendering], count: 6 },
        { id: ClipFilterId.Failed, label: CLIP_FILTER_LABELS[ClipFilterId.Failed], count: 3 },
        { id: ClipFilterId.Ratio916, label: CLIP_FILTER_LABELS[ClipFilterId.Ratio916], count: 90 },
        { id: ClipFilterId.Subtitled, label: CLIP_FILTER_LABELS[ClipFilterId.Subtitled], count: 80 },
      ],
    },
  })
  @Get('filters')
  listFilters(@CurrentUser() user: RequestUser) {
    return this.clipsService.listFilters(user.id);
  }

  @ApiOperation({ summary: 'List clips for the current user' })
  @ApiOkResponse({
    description: 'Array of clip objects',
    schema: { example: [clipExample] },
  })
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.clipsService.list(user.id);
  }

  @ApiOperation({ summary: 'Get a clip by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Clip object',
    schema: { example: clipExample },
  })
  @ApiNotFoundResponse({ description: 'Clip not found' })
  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.clipsService.getById(id, user.id);
  }
}
