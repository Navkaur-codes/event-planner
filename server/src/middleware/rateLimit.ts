import { rateLimit } from 'express-rate-limit';
import { sendError } from './errors.js';

const WINDOW_MS = 60_000;

function limiter(limitPerMinute: number, message: string, keyGenerator?: () => string) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: limitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (_req, res) => sendError(res, 429, 'RATE_LIMITED', message),
  });
}

/** Per-IP limit for /api routes, so one visitor cannot crowd out everyone else. */
export function apiRateLimit(limitPerMinute: number) {
  return limiter(limitPerMinute, 'Too many requests — please wait a minute and try again.');
}

/**
 * Limit shared by all visitors. It caps total calls to the free Groq quota even if requests
 * come from many IPs; the per-IP limit alone cannot do that.
 */
export function apiGlobalRateLimit(limitPerMinute: number) {
  return limiter(
    limitPerMinute,
    'The planner is very busy right now — please try again in a minute.',
    () => 'all-clients',
  );
}
