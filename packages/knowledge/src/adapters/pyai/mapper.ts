import type {
  AddDocumentInput,
  CreateKnowledgeBaseInput,
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeSearchResult,
} from '@mintreels/domain';

export interface PyAIKnowledgeBase {
  id: string;
  name: string;
}

export interface PyAIDocument {
  id: string;
  knowledge_base_id: string;
  title?: string;
}

export interface PyAISearchHit {
  document_id: string;
  score: number;
  excerpt: string;
  metadata?: {
    recording_id?: string;
  };
}

export function toDomainKnowledgeBase(
  pyai: PyAIKnowledgeBase,
  input: Pick<CreateKnowledgeBaseInput, 'scope' | 'recordingId'>,
): KnowledgeBase {
  const knowledgeBase: KnowledgeBase = {
    id: pyai.id,
    name: pyai.name,
    scope: input.scope,
    provider: 'pyai',
    providerKnowledgeBaseId: pyai.id,
  };

  if (input.recordingId !== undefined) {
    knowledgeBase.recordingId = input.recordingId;
  }

  return knowledgeBase;
}

export function toDomainDocument(
  pyai: PyAIDocument,
  input: Pick<AddDocumentInput, 'knowledgeBaseId' | 'recordingId'>,
): KnowledgeDocument {
  const document: KnowledgeDocument = {
    id: pyai.id,
    knowledgeBaseId: input.knowledgeBaseId,
    providerDocumentId: pyai.id,
  };

  if (input.recordingId !== undefined) {
    document.recordingId = input.recordingId;
  }

  return document;
}

export function toDomainSearchResult(hit: PyAISearchHit): KnowledgeSearchResult {
  const result: KnowledgeSearchResult = {
    documentId: hit.document_id,
    score: hit.score,
    excerpt: hit.excerpt,
  };

  if (hit.metadata?.recording_id !== undefined) {
    result.recordingId = hit.metadata.recording_id;
  }

  return result;
}

export function toPyAICreateKnowledgeBaseBody(input: CreateKnowledgeBaseInput): {
  name: string;
} {
  return { name: input.name };
}

export function toPyAIAddDocumentBody(input: AddDocumentInput): {
  title: string;
  content: string;
  metadata: { recording_id: string };
} {
  return {
    title: input.title,
    content: input.content,
    metadata: { recording_id: input.recordingId },
  };
}
