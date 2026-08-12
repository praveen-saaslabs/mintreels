import { Hono } from 'hono';
import { clipsController } from '../controllers';

export const clipsRoutes = new Hono()
  .post('/', (c) => clipsController.create(c))
  .get('/:id', (c) => clipsController.getById(c));
