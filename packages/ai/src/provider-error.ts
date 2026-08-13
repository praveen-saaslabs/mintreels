export class ProviderError extends Error {
  readonly provider: string;
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly metadata?: Record<string, unknown>;

  constructor(init: {
    provider: string;
    code: string;
    message: string;
    retryable: boolean;
    retryAfterMs?: number;
    metadata?: Record<string, unknown>;
  }) {
    super(init.message);
    this.name = 'ProviderError';
    this.provider = init.provider;
    this.code = init.code;
    this.retryable = init.retryable;
    if (init.retryAfterMs !== undefined) {
      this.retryAfterMs = init.retryAfterMs;
    }
    if (init.metadata !== undefined) {
      this.metadata = init.metadata;
    }
  }
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

export function isRetryableProviderError(error: unknown): boolean {
  return isProviderError(error) && error.retryable;
}
