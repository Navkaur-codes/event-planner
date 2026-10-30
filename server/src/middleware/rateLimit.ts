import { rateLimit } from 'express-rate-limit';
import { sendError } from './errors.js';

/** Per-IP limit for /api routes; protects the free Groq quota from abuse. */
export function apiRateLimit(limitPerMinute: number) {
  return rateLimit({
    windowMs: 60_000,
    limit: limitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) =>
      sendError(
        res,
        429,
        'RATE_LIMITED',
        'Too many requests — please wait a minute and try again.',
      ),
  });
}
