import type { Hook, Summary, Transcript } from '@mintreels/domain';
import type { LLMProvider } from '../../llm-provider';
import type { EmbeddingProvider } from '../../embedding-provider';
import type { PyAIClient } from './client';

export class PyAILLMProvider implements LLMProvider, EmbeddingProvider {
  constructor(private readonly client: PyAIClient) {}

  async summarize(_transcript: Transcript): Promise<Summary> {
    void this.client;
    // TODO: call PyAI LLM summarize and map to Summary
    throw new Error('PyAILLMProvider.summarize is not implemented');
  }

  async generateHooks(_transcript: Transcript): Promise<Hook[]> {
    void this.client;
    // TODO: call PyAI LLM hook generation and map to Hook[]
    throw new Error('PyAILLMProvider.generateHooks is not implemented');
  }

  async embed(_text: string): Promise<number[]> {
    void this.client;
    // TODO: call PyAI embeddings API
    throw new Error('PyAILLMProvider.embed is not implemented');
  }
}
