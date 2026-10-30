/**
 * Express application factory. Kept free of process-level side effects so tests
 * can create isolated apps with their own config.
 */
import { existsSync } from 'node:fs';
import { sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HealthResponse } from '@utsav/shared';
import compression from 'compression';
import express, { type Express } from 'express';
import { APP_VERSION, isAiConfigured, type AppConfig } from './config.js';
import type { Logger } from './logger.js';
import { apiNotFound, errorHandler } from './middleware/errors.js';
import { apiRateLimit } from './middleware/rateLimit.js';
import { securityHeaders } from './middleware/security.js';
import { portStatus } from './ports.js';
import { apiRouter } from './routes/index.js';

const DEFAULT_WEB_DIST = fileURLToPath(new URL('../../web/dist', import.meta.url));

interface AppDependencies {
  config: AppConfig;
  logger: Logger;
  /** Folder with the built web app; served when it exists. */
  webDist?: string;
}

/** Creates the HTTP app: security middleware, /api routes and the static web app. */
export function createApp({
  config,
  logger,
  webDist = DEFAULT_WEB_DIST,
}: AppDependencies): Express {
  const app = express();
  app.set('trust proxy', 1); // Render terminates TLS in front of the app.
  app.use(securityHeaders);
  app.use(compression());

  app.get('/api/health', (_req, res) => {
    const body: HealthResponse = {
      status: 'ok',
      version: APP_VERSION,
      ports: portStatus(),
      aiConfigured: isAiConfigured(config),
    };
    res.json(body);
  });

  app.use('/api', apiRateLimit(config.rateLimitPerMin), express.json({ limit: '10kb' }), apiRouter);
  app.use('/api', apiNotFound);

  if (existsSync(webDist)) serveWebApp(app, webDist);

  app.use(errorHandler(logger));
  return app;
}

function serveWebApp(app: Express, webDist: string): void {
  app.use(
    express.static(webDist, {
      index: false,
      setHeaders: (res, filePath) => {
        const isHashedAsset = filePath.includes(`${sep}assets${sep}`);
        res.setHeader(
          'Cache-Control',
          isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    }),
  );
  // Single-page app: every other GET returns index.html.
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile('index.html', { root: webDist });
  });
}
