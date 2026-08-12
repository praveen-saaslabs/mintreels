interface PyAIClientConfig {
  apiKey: string;
  baseUrl: string;
}

function requireConfig(): PyAIClientConfig {
  const apiKey = process.env.PYAI_API_KEY;
  const baseUrl = process.env.PYAI_BASE_URL;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('PYAI_API_KEY is required');
  }
  if (!baseUrl || baseUrl.trim() === '') {
    throw new Error('PYAI_BASE_URL is required');
  }

  return { apiKey, baseUrl };
}

export class PyAIKnowledgeClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: PyAIClientConfig = requireConfig()) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
  }

  async request<T>(_path: string, _init?: RequestInit): Promise<T> {
    void this.apiKey;
    void this.baseUrl;
    // TODO: perform authenticated PyAI Knowledge Base HTTP calls.
    // Never log apiKey or Authorization headers.
    throw new Error('PyAIKnowledgeClient.request is not implemented');
  }
}
