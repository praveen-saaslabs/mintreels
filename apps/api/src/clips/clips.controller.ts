import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
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
import { CurrentActor } from '../guest/current-actor.decorator';
import { ownership, type RequestActor } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CLIP_FILTER_LABELS,
  ClipFilterId,
  ClipFitMode,
  ClipRatio,
  ClipStatus,
} from '@mintreels/schema';
import { createClipRequestSchema, type CreateClipRequest } from './clips.dto';
import { ClipsService } from './clips.service';

const clipExample = {
  id: 1,
  title: 'The roadmap was never a plan',
  socialTitle: 'The roadmap was never a plan',
  socialDescription: 'A sharp take on why roadmaps fail — and what to do instead.',
  recordingId: 10,
  hookId: 4,
  projectId: 2,
  projectName: 'Q3 Product Podcast',
  recordingTitle: 'Ep. 14',
  startMs: 252000,
  endMs: 293000,
  status: ClipStatus.Ready,
  aspectRatio: ClipRatio.Vertical,
  fitMode: ClipFitMode.Fit,
  burnSubtitles: true,
  subtitleStyle: 'bold_mint',
  videoUrl: 'https://cdn.filestackcontent.com/HANDLE',
  thumbnailUrl: 'https://cdn.filestackcontent.com/THUMB',
  ratio: ClipRatio.Vertical,
};

@ApiTags('Clips')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(IdentityGuard, GuestRateLimitGuard)
@Controller('api/clips')
export class ClipsController {
  constructor(private readonly clipsService: ClipsService) {}

  @ApiOperation({ summary: 'Create a clip from a recording time range' })
  @ApiCreatedResponse({
    description: 'Clip created; render job enqueued',
    schema: { example: { ...clipExample, status: ClipStatus.Queued, hookId: null } },
  })
  @ApiBadRequestResponse({ description: 'INVALID_CLIP_RANGE' })
  @ApiConflictResponse({ description: 'VIDEO_NOT_AVAILABLE' })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @Post()
  create(
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(createClipRequestSchema)) body: CreateClipRequest,
  ) {
    return this.clipsService.create(body, ownership(actor));
  }

  @ApiOperation({ summary: 'List clip filter counts for the current user' })
  @ApiOkResponse({
    description: 'Filter ids with labels and counts',
    schema: {
      example: [
        { id: ClipFilterId.All, label: CLIP_FILTER_LABELS[ClipFilterId.All], count: 128 },
        { id: ClipFilterId.Queued, label: CLIP_FILTER_LABELS[ClipFilterId.Queued], count: 5 },
        { id: ClipFilterId.Rendering, label: CLIP_FILTER_LABELS[ClipFilterId.Rendering], count: 6 },
        { id: ClipFilterId.Ready, label: CLIP_FILTER_LABELS[ClipFilterId.Ready], count: 114 },
        { id: ClipFilterId.Failed, label: CLIP_FILTER_LABELS[ClipFilterId.Failed], count: 3 },
      ],
    },
  })
  @Get('filters')
  listFilters(@CurrentActor() actor: RequestActor) {
    return this.clipsService.listFilters(ownership(actor));
  }

  @ApiOperation({ summary: 'List clips for the current user' })
  @ApiOkResponse({
    description: 'Array of clip objects',
    schema: { example: [clipExample] },
  })
  @Get()
  list(@CurrentActor() actor: RequestActor) {
    return this.clipsService.list(ownership(actor));
  }

  @ApiOperation({ summary: 'Get a clip by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Clip object',
    schema: { example: clipExample },
  })
  @ApiNotFoundResponse({ description: 'Clip not found' })
  @Get(':id')
  getById(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.clipsService.getById(id, ownership(actor));
  }

  @ApiOperation({ summary: 'Generate social title and description for a ready clip' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Clip with socialTitle and socialDescription persisted',
    schema: { example: clipExample },
  })
  @ApiNotFoundResponse({ description: 'Clip not found' })
  @ApiConflictResponse({ description: 'CLIP_NOT_READY or TRANSCRIPT_REQUIRED' })
  @Post(':id/social-copy')
  generateSocialCopy(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.clipsService.generateSocialCopy(id, user.id);
  }

  @ApiOperation({ summary: 'Soft-delete a clip' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Clip deleted' })
  @ApiNotFoundResponse({ description: 'Clip not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentActor() actor: RequestActor, @Param('id', ParseIntPipe) id: number) {
    return this.clipsService.remove(id, ownership(actor));
  }
}
