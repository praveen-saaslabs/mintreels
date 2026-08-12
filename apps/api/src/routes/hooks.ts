import { Hono } from 'hono';
import { hooksController } from '../controllers';

export const hooksRoutes = new Hono()
  .get('/:id/hooks', (c) => hooksController.listByRecordingId(c))
  .post('/:id/hooks/generate', (c) => hooksController.generate(c));
