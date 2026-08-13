import { ProviderError } from '../../provider-error';

const PROVIDER = 'qdrant';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function invalid(message: string): ProviderError {
  return new ProviderError({ provider: PROVIDER, code: 'invalid_request', message, retryable: false });
}

/**
 * Qdrant point ids must be an unsigned integer or a UUID. Hook vectors use MySQL PKs;
 * transcript windows use deterministic UUIDs.
 */
export function toPointId(id: string): number | string {
  const trimmed = id.trim();
  if (/^\d+$/.test(trimmed)) {
    const value = Number(trimmed);
    if (Number.isSafeInteger(value)) {
      return value;
    }
  }
  const normalized = trimmed.toLowerCase();
  if (UUID_RE.test(normalized)) {
    return normalized;
  }
  throw invalid(`Unsupported vector id: ${id}`);
}
