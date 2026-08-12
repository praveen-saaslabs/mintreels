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
