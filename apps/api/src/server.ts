import { serve } from '@hono/node-server';
import { createApp } from './app';

function parsePort(value: string | undefined): number {
  if (!value || value.trim() === '') {
    return 3000;
  }
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

const port = parsePort(process.env.PORT);

serve({ fetch: createApp().fetch, port }, () => {
  console.log(`MintReels API listening on port ${String(port)}`);
});
