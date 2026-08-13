import PyAI from '@pyai/sdk';

const DEFAULT_BASE_URL = 'https://api.pyai.com';

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

  return {
    apiKey,
    baseUrl: baseUrl && baseUrl.trim() !== '' ? baseUrl.replace(/\/+$/, '') : DEFAULT_BASE_URL,
  };
}

class HttpStatusError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, payload: unknown) {
    super(`transcription job upload failed (${String(status)})`);
    this.name = 'HttpStatusError';
    this.status = status;
    this.payload = payload;
  }
}

export class PyAIClient {
  readonly sdk: PyAI;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: PyAIClientConfig = requireConfig()) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.sdk = new PyAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  /**
   * Multipart job create. The SDK only accepts `audio_url`; OpenAPI also allows
   * an `audio` file part so PyAI does not need to fetch our object storage.
   */
  async createTranscriptionJobFromFile(input: {
    body: Uint8Array;
    filename: string;
    idempotencyKey?: string;
  }): Promise<unknown> {
    const form = new FormData();
    const copy = new Uint8Array(input.body.byteLength);
    copy.set(input.body);
    form.set('audio', new Blob([copy], { type: 'audio/wav' }), input.filename);
    form.set('model', 'pyai-hear');
    form.set('diarize', 'true');
    form.set('output_formats', 'json');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (input.idempotencyKey !== undefined && input.idempotencyKey.trim() !== '') {
      headers['Idempotency-Key'] = input.idempotencyKey;
    }

    const response = await fetch(`${this.baseUrl}/v1/transcription/jobs`, {
      method: 'POST',
      headers,
      body: form,
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new HttpStatusError(response.status, payload);
    }
    return payload;
  }
}
