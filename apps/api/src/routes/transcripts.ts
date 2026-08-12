import { Hono } from 'hono';
import { transcriptsController } from '../controllers';

export const transcriptsRoutes = new Hono()
  .get('/:id/transcript', (c) => transcriptsController.getByRecordingId(c))
  .get('/:id/transcript.vtt', (c) => transcriptsController.getVttByRecordingId(c))
  .get('/:id/summary', (c) => transcriptsController.getSummaryByRecordingId(c));
