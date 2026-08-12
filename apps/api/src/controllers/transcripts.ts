import type { Context } from 'hono';
import { requireParam } from '../middleware';
import { transcriptsService } from '../services';

export const transcriptsController = {
  getByRecordingId(c: Context) {
    requireParam(c.req.param('id'), 'id');
    return transcriptsService.getByRecordingId();
  },
  getVttByRecordingId(c: Context) {
    requireParam(c.req.param('id'), 'id');
    return transcriptsService.getVttByRecordingId();
  },
  getSummaryByRecordingId(c: Context) {
    requireParam(c.req.param('id'), 'id');
    return transcriptsService.getSummaryByRecordingId();
  },
};
