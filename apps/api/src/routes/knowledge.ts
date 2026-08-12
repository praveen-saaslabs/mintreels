import { Hono } from 'hono';
import { knowledgeController } from '../controllers';

export const knowledgeRoutes = new Hono()
  .get('/', (c) => knowledgeController.list(c))
  .post('/', (c) => knowledgeController.create(c));
