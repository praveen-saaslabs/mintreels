export const QUEUE_NAME = 'mintreels';

export const jobNames = {
  ingestVideo: 'ingest-video',
  transcribe: 'transcribe',
  summarize: 'summarize',
  generateHooks: 'generate-hooks',
  syncKnowledgeBase: 'sync-knowledge-base',
  renderClip: 'render-clip',
} as const;
