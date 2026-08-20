import { Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
  type HookWeightsSettings,
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

  @ApiOperation({ summary: 'Get hook scoring weights configuration' })
  @ApiOkResponse({
    description: 'Current hook scoring weights',
    schema: {
      example: {
        quality: 0.22,
        standalone: 0.15,
        curiosity: 0.12,
        emotional: 0.08,
        specificity: 0.08,
        shareability: 0.08,
        novelty: 0.04,
        controversy: 0.12,
        headline: 0.11,
      },
    },
  })
  @Get('hook-weights')
  async getHookWeights(): Promise<HookWeightsSettings> {
    return this.settingsService.getHookWeights();
  }

  @ApiOperation({ summary: 'Update hook scoring weights configuration' })
  @ApiOkResponse({
    description: 'Updated hook scoring weights',
    schema: {
      example: {
        quality: 0.22,
        standalone: 0.15,
        curiosity: 0.12,
        emotional: 0.08,
        specificity: 0.08,
        shareability: 0.08,
        novelty: 0.04,
        controversy: 0.12,
        headline: 0.11,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid weights (must sum to 1.0 and be between 0-1)',
  })
  @Put('hook-weights')
  async updateHookWeights(@Body() weights: HookWeightsSettings): Promise<HookWeightsSettings> {
    return this.settingsService.updateHookWeights(weights);
  }

  @ApiOperation({ summary: 'Reset hook scoring weights to default values' })
  @ApiOkResponse({
    description: 'Reset hook scoring weights to defaults',
    schema: {
      example: {
        quality: 0.22,
        standalone: 0.15,
        curiosity: 0.12,
        emotional: 0.08,
        specificity: 0.08,
        shareability: 0.08,
        novelty: 0.04,
        controversy: 0.12,
        headline: 0.11,
      },
    },
  })
  @Delete('hook-weights')
  async resetHookWeights(): Promise<HookWeightsSettings> {
    return this.settingsService.resetHookWeights();
  }
}
