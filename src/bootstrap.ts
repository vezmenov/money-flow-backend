import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { requestLoggerMiddleware } from './common/request-logger.middleware';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');

  app.use(requestLoggerMiddleware);
  app.use(helmet());

  // Body size limits:
  // - default: 1mb for everything
  // - OpenClaw import: 5mb (batched agent payloads)
  app.use('/api/openclaw/v1/transactions/import', json({ limit: '5mb' }));
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  if (corsOrigin) {
    const origins = corsOrigin
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    app.enableCors({
      origin: origins.length <= 1 ? (origins[0] ?? false) : origins,
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();
}
