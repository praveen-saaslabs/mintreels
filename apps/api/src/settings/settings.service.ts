import { Injectable, Logger } from '@nestjs/common';
import { JobRepository, SystemSettingsRepository } from '@mintreels/db';
import {
  ClipRatio,
  EnvKey,
  JobStatus,
  ProviderConnectionStatus,
  SecretPresence,
  SettingsProviderId,
  SettingKey,
  DEFAULT_HOOK_WEIGHTS,
  hookWeightsSchema,
  type HookWeightsSettings,
} from '@mintreels/schema';

function envValue(key: EnvKey): string {
  return process.env[key]?.trim() || '';
}

function envSet(key: EnvKey): boolean {
  return Boolean(envValue(key));
}

function maskedKey(configured: boolean): SecretPresence {
  return configured ? SecretPresence.Configured : SecretPresence.NotConfigured;
}

function connectionStatus(configured: boolean): ProviderConnectionStatus {
  return configured ? ProviderConnectionStatus.Connected : ProviderConnectionStatus.NotSet;
}

const RENDER_DEFAULTS = [
  {
    id: 'aspect',
    kind: 'choice' as const,
    label: 'Default aspect ratio',
    help: 'Applied to every new clip cut from a hook or transcript selection.',
    options: [
      { id: ClipRatio.Vertical, label: ClipRatio.Vertical },
      { id: ClipRatio.Square, label: ClipRatio.Square },
      { id: ClipRatio.Widescreen, label: ClipRatio.Widescreen },
    ],
    selectedId: ClipRatio.Vertical,
  },
  {
    id: 'caption',
    kind: 'choice' as const,
    label: 'Caption preset',
    help: 'Style used when subtitles are burned into the render.',
    options: [
      { id: 'bold_mint', label: 'Bold Mint' },
      { id: 'clean_mono', label: 'Clean Mono' },
      { id: 'karaoke', label: 'Karaoke' },
    ],
    selectedId: 'bold_mint',
  },
  {
    id: 'burn_subs',
    kind: 'toggle' as const,
    label: 'Burn in subtitles',
    help: 'Off keeps captions as a sidecar VTT file instead.',
    enabled: true,
  },
  {
    id: 'auto_reframe',
    kind: 'toggle' as const,
    label: 'Auto-reframe with speaker tracking',
    help: 'Crops to the active speaker when rendering vertical clips.',
    enabled: true,
  },
  {
    id: 'auto_hooks',
    kind: 'toggle' as const,
    label: 'Auto-generate hooks on ingest',
    help: 'Runs GENERATE_HOOKS as soon as a transcript completes.',
    enabled: false,
  },
];

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly jobs: JobRepository,
    private readonly systemSettings: SystemSettingsRepository,
  ) {}

  async getSnapshot(userId: number) {
    const pyaiKey = envSet(EnvKey.PyaiApiKey);
    const aiProvider = envValue(EnvKey.AiProvider);
    const llmProvider = envValue(EnvKey.LlmProvider) || 'openai';
    const kbProvider = envValue(EnvKey.KnowledgeBaseProvider);
    const storageProvider = envValue(EnvKey.StorageProvider);
    const storageConfigured = envSet(EnvKey.FilestackApiKey);
    const speechConfigured = Boolean(aiProvider) && pyaiKey;
    const llmConfigured =
      llmProvider === 'nvidia' ? envSet(EnvKey.NvidiaApiKey) : envSet(EnvKey.OpenaiApiKey);
    const kbConfigured = Boolean(kbProvider) && pyaiKey;

    const failedJobs = await this.jobs.find({
      where: {
        status: JobStatus.Failed,
        recording: { project: { userId } },
      },
      select: ['id', 'attempt', 'maxAttempts'],
    });

    return {
      providers: [
        {
          id: SettingsProviderId.Speech,
          label: 'Speech-to-text',
          envKey: EnvKey.AiProvider,
          maskedKey: maskedKey(speechConfigured),
          model: aiProvider || 'not set',
          status: connectionStatus(speechConfigured),
        },
        {
          id: SettingsProviderId.Llm,
          label: 'LLM (hooks, summary)',
          envKey: EnvKey.LlmProvider,
          maskedKey: maskedKey(llmConfigured),
          model: llmProvider,
          status: connectionStatus(llmConfigured),
        },
        {
          id: SettingsProviderId.Knowledge,
          label: 'Knowledge base',
          envKey: EnvKey.KnowledgeBaseProvider,
          maskedKey: maskedKey(kbConfigured),
          model: kbProvider || 'not set',
          status: connectionStatus(kbConfigured),
        },
        {
          id: SettingsProviderId.Storage,
          label: 'Object storage',
          envKey: EnvKey.StorageProvider,
          maskedKey: maskedKey(storageConfigured),
          model: storageProvider || 'not set',
          status: connectionStatus(storageConfigured),
        },
      ],
      renderDefaults: RENDER_DEFAULTS,
      storageJobs: {
        mediaOnDiskGb: 0,
        workerConcurrency: Number(process.env[EnvKey.WorkerConcurrency]) || 1,
        failedJobsRetryable: failedJobs.filter((job) => job.attempt < job.maxAttempts).length,
      },
    };
  }

  /**
   * Get hook scoring weights from database with environment variable fallback.
   */
  async getHookWeights(): Promise<HookWeightsSettings> {
    try {
      const setting = await this.systemSettings.findByKey(SettingKey.HookWeights);
      if (setting?.settingValue) {
        // Validate the stored weights
        const result = hookWeightsSchema.safeParse(setting.settingValue);
        if (result.success) {
          return result.data;
        } else {
          this.logger.warn(
            'Invalid hook weights in database, falling back to environment defaults',
            {
              errors: result.error.errors,
            },
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        'Failed to load hook weights from database, falling back to environment defaults',
        {
          error: error instanceof Error ? error.message : error,
        },
      );
    }

    // Fallback to environment variables or defaults
    return this.getHookWeightsFromEnv();
  }

  /**
   * Update hook scoring weights in database.
   */
  async updateHookWeights(weights: HookWeightsSettings): Promise<HookWeightsSettings> {
    // Validate weights before saving
    const validatedWeights = hookWeightsSchema.parse(weights);

    await this.systemSettings.upsertSetting(
      SettingKey.HookWeights,
      validatedWeights,
      'Hook scoring dimension weights for content analysis',
    );

    return validatedWeights;
  }

  /**
   * Reset hook weights to default values.
   */
  async resetHookWeights(): Promise<HookWeightsSettings> {
    return this.updateHookWeights(DEFAULT_HOOK_WEIGHTS);
  }

  /**
   * Get hook weights from environment variables with defaults.
   */
  private getHookWeightsFromEnv(): HookWeightsSettings {
    const envWeights = {
      quality: Number(envValue(EnvKey.HookWeightQuality)) || DEFAULT_HOOK_WEIGHTS.quality,
      standalone: Number(envValue(EnvKey.HookWeightStandalone)) || DEFAULT_HOOK_WEIGHTS.standalone,
      curiosity: Number(envValue(EnvKey.HookWeightCuriosity)) || DEFAULT_HOOK_WEIGHTS.curiosity,
      emotional: Number(envValue(EnvKey.HookWeightEmotional)) || DEFAULT_HOOK_WEIGHTS.emotional,
      specificity:
        Number(envValue(EnvKey.HookWeightSpecificity)) || DEFAULT_HOOK_WEIGHTS.specificity,
      shareability:
        Number(envValue(EnvKey.HookWeightShareability)) || DEFAULT_HOOK_WEIGHTS.shareability,
      novelty: Number(envValue(EnvKey.HookWeightNovelty)) || DEFAULT_HOOK_WEIGHTS.novelty,
      controversy:
        Number(envValue(EnvKey.HookWeightControversy)) || DEFAULT_HOOK_WEIGHTS.controversy,
      headline: Number(envValue(EnvKey.HookWeightHeadline)) || DEFAULT_HOOK_WEIGHTS.headline,
    };

    // Validate the environment-based weights
    const result = hookWeightsSchema.safeParse(envWeights);
    if (result.success) {
      return result.data;
    }

    // If environment weights are invalid, return hardcoded defaults
    this.logger.warn('Invalid hook weights from environment, using hardcoded defaults', {
      errors: result.error.errors,
    });
    return DEFAULT_HOOK_WEIGHTS;
  }
}
