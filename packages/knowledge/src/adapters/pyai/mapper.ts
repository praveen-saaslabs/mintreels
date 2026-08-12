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
    // Domain id is assigned by MySQL on persist; PyAI id lives in providerKnowledgeBaseId.
    id: 0,
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
    id: 0,
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
    // Provider document ids are opaque strings; domain documentId is numeric after persist.
    documentId: Number.parseInt(hit.document_id, 10) || 0,
    score: hit.score,
    excerpt: hit.excerpt,
  };

  if (hit.metadata?.recording_id !== undefined) {
    const recordingId = Number.parseInt(hit.metadata.recording_id, 10);
    if (Number.isFinite(recordingId) && recordingId > 0) {
      result.recordingId = recordingId;
    }
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
    metadata: { recording_id: String(input.recordingId) },
  };
}
