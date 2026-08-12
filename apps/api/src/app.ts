import { Hono } from 'hono';
import { HttpError } from './middleware';
import { recordingsRoutes } from './routes/recordings';
import { knowledgeRoutes } from './routes/knowledge';
import { clipsRoutes } from './routes/clips';

export function createApp() {
  const app = new Hono();

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return c.json({ error: error.message }, error.status as 400 | 501);
    }
    return c.json({ error: 'Internal server error' }, 500);
  });

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.route('/api/recordings', recordingsRoutes);
  app.route('/api/knowledge-bases', knowledgeRoutes);
  app.route('/api/clips', clipsRoutes);

  return app;
}
