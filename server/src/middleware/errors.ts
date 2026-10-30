import type { ApiError, ApiErrorCode } from '@utsav/shared';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import type { Logger } from '../logger.js';

/** Sends the contract's ApiError envelope. */
export function sendError(
  res: Response,
  status: number,
  code: ApiErrorCode,
  message: string,
  issues?: ApiError['error']['issues'],
): void {
  const body: ApiError = { error: { code, message, ...(issues ? { issues } : {}) } };
  res.status(status).json(body);
}

/** 404 for any /api route that no router handled. */
export const apiNotFound: RequestHandler = (_req, res) => {
  sendError(res, 404, 'NOT_FOUND', 'This API route does not exist.');
};

interface HttpLikeError {
  type?: string;
  status?: number;
}

/** Final error handler: body-parser errors become 400/413, everything else a generic 500. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const { type } = (err ?? {}) as HttpLikeError;
    if (type === 'entity.parse.failed') {
      sendError(res, 400, 'VALIDATION', 'Request body is not valid JSON.');
      return;
    }
    if (type === 'entity.too.large') {
      sendError(res, 413, 'VALIDATION', 'Request body is too large.');
      return;
    }
    logger.error('Unhandled error', { method: req.method, path: req.path, err });
    sendError(res, 500, 'INTERNAL', 'Something went wrong on our side. Please try again.');
  };
}
