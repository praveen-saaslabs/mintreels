export type KnowledgeBaseScope = 'recording' | 'global';

export interface KnowledgeBase {
  id: number;
  name: string;
  scope: KnowledgeBaseScope;
  provider: string;
  providerKnowledgeBaseId: string;
  recordingId?: number;
}

export interface KnowledgeDocument {
  id: number;
  knowledgeBaseId: number;
  providerDocumentId: string;
  recordingId?: number;
}

export interface CreateKnowledgeBaseInput {
  name: string;
  scope: KnowledgeBaseScope;
  recordingId?: number;
}

export interface AddDocumentInput {
  knowledgeBaseId: number;
  recordingId: number;
  title: string;
  content: string;
}

export interface RemoveDocumentInput {
  knowledgeBaseId: number;
  documentId: number;
}

export interface KnowledgeSearchInput {
  knowledgeBaseId: number;
  query: string;
  limit?: number;
}

export interface KnowledgeSearchResult {
  documentId: number;
  recordingId?: number;
  score: number;
  excerpt: string;
}
