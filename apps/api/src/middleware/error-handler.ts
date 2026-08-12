import type { Context, Next } from 'hono';
import { HttpError } from './errors';

export async function errorHandler(c: Context, next: Next): Promise<Response | void> {
  try {
    await next();
    return;
  } catch (error) {
    if (error instanceof HttpError) {
      return c.json({ error: error.message }, error.status as 400 | 501);
    }

    return c.json({ error: 'Internal server error' }, 500);
  }
}
