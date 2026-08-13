import { ProviderError } from '../../provider-error';

function readStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }
  const status = Number((error as { status?: unknown }).status);
  return Number.isFinite(status) && status >= 400 ? status : undefined;
}

function readRetryAfterMs(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('headers' in error)) {
    return undefined;
  }
  const headers = (error as { headers?: unknown }).headers;
  if (typeof headers !== 'object' || headers === null) {
    return undefined;
  }
  const raw = (headers as Record<string, unknown>)['retry-after'];
  const seconds = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : Number.NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }
  return seconds * 1000;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('connection')
  );
}

export function isJsonSchemaUnsupported(error: unknown): boolean {
  if (readStatus(error) !== 400) {
    return false;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('json_schema') ||
    message.includes('response_format') ||
    message.includes('guided_json')
  );
}

export function mapOpenAICompatibleError(error: unknown, provider: string): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }

  const status = readStatus(error);
  const message = error instanceof Error ? error.message : 'Unknown provider error';
  const retryAfterMs = readRetryAfterMs(error);

  if (status === 429 || (status !== undefined && status >= 500)) {
    return new ProviderError({
      provider,
      code: status === 429 ? 'rate_limit_exceeded' : 'server_error',
      message,
      retryable: true,
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      metadata: { status },
    });
  }

  if (status !== undefined && status >= 400) {
    return new ProviderError({
      provider,
      code: 'provider_error',
      message,
      retryable: false,
      metadata: { status },
    });
  }

  if (isNetworkError(error)) {
    return new ProviderError({
      provider,
      code: 'network_error',
      message,
      retryable: true,
    });
  }

  return new ProviderError({
    provider,
    code: 'provider_error',
    message,
    retryable: false,
  });
}
