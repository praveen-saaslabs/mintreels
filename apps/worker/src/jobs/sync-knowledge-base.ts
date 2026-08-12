import type { JobStatus } from '@mintreels/domain';

export interface SyncKnowledgeBasePayload {
  recordingId: number;
  knowledgeBaseId: number;
}

export async function syncKnowledgeBase(_payload: SyncKnowledgeBasePayload): Promise<JobStatus> {
  // TODO: KnowledgeBaseProvider.addDocument for recording KB (and optionally global KB)
  throw new Error('syncKnowledgeBase is not implemented');
}
