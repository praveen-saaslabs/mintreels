import { Injectable } from '@nestjs/common';
import { JobRepository } from '@mintreels/db';
import {
  ClipRatio,
  EnvKey,
  JobStatus,
  ProviderConnectionStatus,
  SecretPresence,
  SettingsProviderId,
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
  constructor(private readonly jobs: JobRepository) {}

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
}
