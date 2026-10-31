import type { ApiError } from '@utsav/shared';
import type { Response } from 'express';
import type { z } from 'zod';
import { sendError } from '../middleware/errors.js';

type Issues = NonNullable<ApiError['error']['issues']>;

/**
 * Validates a request body against a contract schema. Sends a 400 ApiError and
 * returns undefined when it does not match.
 */
export function parseBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
  res: Response,
): z.infer<T> | undefined {
  const parsed = schema.safeParse(body);
  if (parsed.success) return parsed.data;
  const issues = parsed.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  sendValidationError(res, issues);
  return undefined;
}

/** Sends the contract's 400 VALIDATION envelope. */
export function sendValidationError(res: Response, issues: Issues): void {
  sendError(res, 400, 'VALIDATION', 'Some details need fixing.', issues);
}

/** The planning day as ISO "YYYY-MM-DD"; `today` is already resolved via resolveToday. */
function isoDay(today: Date): string {
  return today.toISOString().slice(0, 10);
}

/** Returns an issue when the event date is in the past, otherwise undefined. */
export function pastDateIssue(eventDate: string, today: Date, path = 'eventDate') {
  return eventDate < isoDay(today)
    ? { path, message: 'Event date must be today or later.' }
    : undefined;
}

/** Aborts the returned signal if the client disconnects before the response is sent. */
export function abortOnDisconnect(res: Response): AbortSignal {
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });
  return controller.signal;
}
