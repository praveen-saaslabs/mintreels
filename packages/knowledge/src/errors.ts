export class KnowledgeProviderError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'KnowledgeProviderError';
    this.code = code;
  }
}

export class KnowledgeBaseNotFoundError extends KnowledgeProviderError {
  constructor(id: string) {
    super('KNOWLEDGE_BASE_NOT_FOUND', `Knowledge base not found: ${id}`);
    this.name = 'KnowledgeBaseNotFoundError';
  }
}

export class KnowledgeNotImplementedError extends KnowledgeProviderError {
  constructor(operation: string) {
    super('NOT_IMPLEMENTED', `${operation} is not implemented`);
    this.name = 'KnowledgeNotImplementedError';
  }
}
