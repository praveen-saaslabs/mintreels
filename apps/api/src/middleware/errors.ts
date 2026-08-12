export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function notImplemented(operation: string): never {
  throw new HttpError(501, `${operation} is not implemented`);
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function requireParam(value: string | undefined, name: string): string {
  if (!value || value.trim() === '') {
    throw new HttpError(400, `${name} is required`);
  }
  const trimmed = value.trim();
  if (!ID_PATTERN.test(trimmed)) {
    throw new HttpError(400, `${name} is invalid`);
  }
  return trimmed;
}
