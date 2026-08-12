import type { Context } from 'hono';
import { knowledgeService } from '../services';

export const knowledgeController = {
  list(_c: Context) {
    return knowledgeService.list();
  },
  create(_c: Context) {
    return knowledgeService.create();
  },
};
