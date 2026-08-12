import type {
  AddDocumentInput,
  CreateKnowledgeBaseInput,
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeSearchInput,
  KnowledgeSearchResult,
  RemoveDocumentInput,
} from '../../provider';
import { KnowledgeNotImplementedError } from '../../errors';
import type { KnowledgeBaseProvider } from '../../provider';
import type { PyAIKnowledgeClient } from './client';

export class PyAIKnowledgeBaseProvider implements KnowledgeBaseProvider {
  constructor(private readonly client: PyAIKnowledgeClient) {}

  async createKnowledgeBase(_input: CreateKnowledgeBaseInput): Promise<KnowledgeBase> {
    void this.client;
    throw new KnowledgeNotImplementedError('PyAIKnowledgeBaseProvider.createKnowledgeBase');
  }

  async getKnowledgeBase(_id: string): Promise<KnowledgeBase> {
    void this.client;
    throw new KnowledgeNotImplementedError('PyAIKnowledgeBaseProvider.getKnowledgeBase');
  }

  async deleteKnowledgeBase(_id: string): Promise<void> {
    void this.client;
    throw new KnowledgeNotImplementedError('PyAIKnowledgeBaseProvider.deleteKnowledgeBase');
  }

  async addDocument(_input: AddDocumentInput): Promise<KnowledgeDocument> {
    void this.client;
    throw new KnowledgeNotImplementedError('PyAIKnowledgeBaseProvider.addDocument');
  }

  async removeDocument(_input: RemoveDocumentInput): Promise<void> {
    void this.client;
    throw new KnowledgeNotImplementedError('PyAIKnowledgeBaseProvider.removeDocument');
  }

  async search(_input: KnowledgeSearchInput): Promise<KnowledgeSearchResult[]> {
    void this.client;
    throw new KnowledgeNotImplementedError('PyAIKnowledgeBaseProvider.search');
  }
}
