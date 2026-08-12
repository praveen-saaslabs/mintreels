import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = parsePort(process.env.PORT);
  await app.listen(port);
  console.log(`MintReels API listening on port ${String(port)}`);
}

void bootstrap();
