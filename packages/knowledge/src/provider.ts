import type {
  AddDocumentInput,
  CreateKnowledgeBaseInput,
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeSearchInput,
  KnowledgeSearchResult,
  RemoveDocumentInput,
} from '@mintreels/domain';

export type {
  AddDocumentInput,
  CreateKnowledgeBaseInput,
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeSearchInput,
  KnowledgeSearchResult,
  RemoveDocumentInput,
} from '@mintreels/domain';

export interface KnowledgeBaseProvider {
  createKnowledgeBase(input: CreateKnowledgeBaseInput): Promise<KnowledgeBase>;
  getKnowledgeBase(id: number): Promise<KnowledgeBase>;
  deleteKnowledgeBase(id: number): Promise<void>;
  addDocument(input: AddDocumentInput): Promise<KnowledgeDocument>;
  removeDocument(input: RemoveDocumentInput): Promise<void>;
  search(input: KnowledgeSearchInput): Promise<KnowledgeSearchResult[]>;
}
