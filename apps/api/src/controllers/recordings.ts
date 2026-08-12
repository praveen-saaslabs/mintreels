import type { Context } from 'hono';
import { requireParam } from '../middleware';
import { recordingsService } from '../services';

export const recordingsController = {
  create(_c: Context) {
    return recordingsService.create();
  },
  list(_c: Context) {
    return recordingsService.list();
  },
  getById(c: Context) {
    requireParam(c.req.param('id'), 'id');
    return recordingsService.getById();
  },
  remove(c: Context) {
    requireParam(c.req.param('id'), 'id');
    return recordingsService.remove();
  },
  addToGlobalKnowledgeBase(c: Context) {
    requireParam(c.req.param('id'), 'id');
    return recordingsService.addToGlobalKnowledgeBase();
  },
};
