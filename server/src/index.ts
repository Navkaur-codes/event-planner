import { createApp } from './app.js';
import { loadConfig, loadDotEnv } from './config.js';
import { createLogger } from './logger.js';

loadDotEnv();
const config = loadConfig();
const logger = createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  secrets: config.groqApiKey ? [config.groqApiKey] : [],
});

const server = createApp({ config, logger }).listen(config.port, () => {
  logger.info('Utsav server listening', { port: config.port, env: config.env });
});

const shutdown = (signal: string) => {
  logger.info('Shutting down', { signal });
  server.close(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
