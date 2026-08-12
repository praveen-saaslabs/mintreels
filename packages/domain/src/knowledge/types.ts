export type KnowledgeBaseScope = 'recording' | 'global';

export interface KnowledgeBase {
  id: string;
  name: string;
  scope: KnowledgeBaseScope;
  provider: string;
  providerKnowledgeBaseId: string;
  recordingId?: string;
}

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  providerDocumentId: string;
  recordingId?: string;
}

export interface CreateKnowledgeBaseInput {
  name: string;
  scope: KnowledgeBaseScope;
  recordingId?: string;
}

export interface AddDocumentInput {
  knowledgeBaseId: string;
  recordingId: string;
  title: string;
  content: string;
}

export interface RemoveDocumentInput {
  knowledgeBaseId: string;
  documentId: string;
}

export interface KnowledgeSearchInput {
  knowledgeBaseId: string;
  query: string;
  limit?: number;
}

export interface KnowledgeSearchResult {
  documentId: string;
  recordingId?: string;
  score: number;
  excerpt: string;
}
