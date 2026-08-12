import { Hono } from 'hono';
import { recordingsController } from '../controllers';
import { transcriptsController } from '../controllers';
import { hooksController } from '../controllers';

export const recordingsRoutes = new Hono()
  .post('/', (c) => recordingsController.create(c))
  .get('/', (c) => recordingsController.list(c))
  .get('/:id', (c) => recordingsController.getById(c))
  .delete('/:id', (c) => recordingsController.remove(c))
  .get('/:id/transcript', (c) => transcriptsController.getByRecordingId(c))
  .get('/:id/transcript.vtt', (c) => transcriptsController.getVttByRecordingId(c))
  .get('/:id/summary', (c) => transcriptsController.getSummaryByRecordingId(c))
  .post('/:id/add-to-global-kb', (c) => recordingsController.addToGlobalKnowledgeBase(c))
  .get('/:id/hooks', (c) => hooksController.listByRecordingId(c))
  .post('/:id/hooks/generate', (c) => hooksController.generate(c));
