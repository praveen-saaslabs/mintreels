import type { Context } from 'hono';
import { requireParam } from '../middleware';
import { hooksService } from '../services';

export const hooksController = {
  listByRecordingId(c: Context) {
    requireParam(c.req.param('id'), 'id');
    return hooksService.listByRecordingId();
  },
  generate(c: Context) {
    requireParam(c.req.param('id'), 'id');
    return hooksService.generate();
  },
};
