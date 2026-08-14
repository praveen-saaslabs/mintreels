import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { Logger, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AUTH_COOKIE_NAME, loadWebOrigin } from './common/auth.config';

const LOG_LEVELS: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

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

/** Nest enables listed levels; LOG_LEVEL is the most verbose level to include (default `log`). */
function resolveLogLevels(value: string | undefined): LogLevel[] {
  const raw = (value ?? 'log').trim().toLowerCase();
  const idx = LOG_LEVELS.indexOf(raw as LogLevel);
  if (idx === -1) {
    return ['error', 'warn', 'log'];
  }
  return LOG_LEVELS.slice(0, idx + 1);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: resolveLogLevels(process.env.LOG_LEVEL),
  });
  const logger = new Logger('Bootstrap');
  app.use(cookieParser());
  app.enableCors({ origin: loadWebOrigin(), credentials: true });

  const config = new DocumentBuilder()
    .setTitle('MintReels API')
    .setDescription(
      'Transcript-first video intelligence API. Recordings are the root resource; ' +
        'transcripts, summaries, hooks, and clips hang off them.',
    )
    .setVersion('1.0')
    .addCookieAuth(AUTH_COOKIE_NAME)
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = parsePort(process.env.PORT);
  await app.listen(port);
  logger.log(`MintReels API listening on port ${String(port)}`);
  logger.log(`Swagger UI available at http://localhost:${String(port)}/docs`);
}

void bootstrap();
