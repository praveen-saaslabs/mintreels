import { PyAIError } from '@pyai/sdk';
import { ProviderError } from '../../provider-error';

const RETRYABLE_CODES = new Set([
  'rate_limit_exceeded',
  'concurrency_limit_exceeded',
  'daily_cap_exceeded',
]);

const PERMANENT_CODES = new Set([
  'unauthorized',
  'forbidden',
  'credit_exhausted',
  'key_budget_exceeded',
  'insufficient_quota',
  'invalid_request_error',
  'unsupported_language',
  'idempotency_conflict',
]);

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
    message.includes('enotfound')
  );
}

function retryAfterMsFromError(error: PyAIError): number | undefined {
  const match = /retry-after[:\s]+(\d+)/i.exec(error.message);
  if (!match?.[1]) {
    return undefined;
  }
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }
  return seconds * 1000;
}

function codeFromUnknownPayload(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.error === 'object' && record.error !== null) {
    const nested = record.error as Record<string, unknown>;
    if (typeof nested.code === 'string') {
      return nested.code;
    }
  }
  if (typeof record.type === 'string') {
    const parts = record.type.split('/');
    return parts[parts.length - 1];
  }
  return undefined;
}

/**
 * PyAI marks a transcription *job* failed and puts the upstream STT HTTP error
 * in `job.error` (e.g. "stt: HTTP 503: upstream connect error..."). That path
 * never goes through mapPyAIError, so callers must classify retryability here.
 */
export function isRetryableTranscriptionJobError(message: string | undefined): boolean {
  if (message === undefined || message.trim() === '') {
    return false;
  }
  if (/\bHTTP\s*(429|5\d\d)\b/i.test(message)) {
    return true;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes('upstream connect error') ||
    lower.includes('remote connection failure') ||
    lower.includes('connection reset') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('timeout')
  );
}

export function mapPyAIError(error: unknown, provider = 'pyai'): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }

  if (error instanceof PyAIError) {
    const code = error.code ?? (error.status >= 500 ? 'server_error' : 'provider_error');
    const retryAfterMs = error.status === 429 ? retryAfterMsFromError(error) : undefined;
    const retryable =
      RETRYABLE_CODES.has(code) || error.status === 429 || error.status >= 500;
    const mapped = new ProviderError({
      provider,
      code,
      message: error.message,
      retryable: retryable && !PERMANENT_CODES.has(code),
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      metadata: { status: error.status },
    });
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return new ProviderError({
        provider,
        code,
        message: error.message,
        retryable: false,
        metadata: { status: error.status },
      });
    }
    return mapped;
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = Number((error as { status?: unknown }).status);
    if (Number.isFinite(status) && status >= 400) {
      const payload = (error as { payload?: unknown }).payload;
      const code = codeFromUnknownPayload(payload) ?? (status >= 500 ? 'server_error' : 'provider_error');
      const message = error instanceof Error ? error.message : `HTTP ${String(status)}`;
      return new ProviderError({
        provider,
        code,
        message,
        retryable: status === 429 || status >= 500,
        metadata: { status },
      });
    }
  }

  if (isNetworkError(error)) {
    return new ProviderError({
      provider,
      code: 'network_error',
      message: error instanceof Error ? error.message : 'Network error',
      retryable: true,
    });
  }

  return new ProviderError({
    provider,
    code: 'provider_error',
    message: error instanceof Error ? error.message : 'Unknown provider error',
    retryable: false,
  });
}
