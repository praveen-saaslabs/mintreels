import axios from 'axios';

const API_BASE = '/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(status > 0 ? `API request failed with status ${String(status)}` : 'API request failed');
    this.name = 'ApiError';
    this.status = status;
  }
}

function normalizeApiPath(path: string): string {
  const trimmed = path.trim();
  if (trimmed.length === 0) {
    throw new Error('Invalid API path');
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // Axios treats `http(s)://` and `//host` URLs as absolute; keep requests on the API base.
  if (normalized.startsWith('//') || normalized.includes('://')) {
    throw new Error('Invalid API path');
  }

  return normalized;
}

export const http = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: 'application/json',
  },
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;
    return Promise.reject(new ApiError(status));
  },
);

export async function getJson<T>(path: string): Promise<T> {
  const { data } = await http.get<T>(normalizeApiPath(path));
  return data;
}
