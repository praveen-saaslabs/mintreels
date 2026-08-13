import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AUTH_COOKIE_NAME, loadWebOrigin } from './common/auth.config';

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
  console.log(`MintReels API listening on port ${String(port)}`);
  console.log(`Swagger UI available at http://localhost:${String(port)}/docs`);
}

void bootstrap();
