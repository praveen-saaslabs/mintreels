import type { Context } from 'hono';
import { requireParam } from '../middleware';
import { clipsService } from '../services';

export const clipsController = {
  create(_c: Context) {
    return clipsService.create();
  },
  getById(c: Context) {
    requireParam(c.req.param('id'), 'id');
    return clipsService.getById();
  },
};
