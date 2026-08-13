import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import {
  ClipRatio,
  EnvKey,
  ProviderConnectionStatus,
  SecretPresence,
  SettingsProviderId,
} from '@mintreels/schema';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/auth.types';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiCookieAuth('auth_token')
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED' })
@UseGuards(AuthGuard)
@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiOperation({ summary: 'Get provider, render, and job settings snapshot' })
  @ApiOkResponse({
    description: 'Settings snapshot; secrets are never returned',
    schema: {
      example: {
        providers: [
          {
            id: SettingsProviderId.Speech,
            label: 'Speech-to-text',
            envKey: EnvKey.AiProvider,
            maskedKey: SecretPresence.Configured,
            model: 'pyai',
            status: ProviderConnectionStatus.Connected,
          },
        ],
        renderDefaults: [
          {
            id: 'aspect',
            kind: 'choice',
            label: 'Default aspect ratio',
            help: 'Applied to every new clip cut from a hook or transcript selection.',
            options: [
              { id: ClipRatio.Vertical, label: ClipRatio.Vertical },
              { id: ClipRatio.Square, label: ClipRatio.Square },
              { id: ClipRatio.Widescreen, label: ClipRatio.Widescreen },
            ],
            selectedId: ClipRatio.Vertical,
          },
        ],
        storageJobs: { mediaOnDiskGb: 0, workerConcurrency: 1, failedJobsRetryable: 0 },
      },
    },
  })
  @Get()
  getSnapshot(@CurrentUser() user: RequestUser) {
    return this.settingsService.getSnapshot(user.id);
  }
}
