import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ZodError } from 'zod';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId || 'unknown';

  if (err instanceof ZodError) {
    logger.warn({ requestId, errors: err.flatten() }, 'Validation error');
    res.status(400).json({
      error: 'validation_error',
      message: 'Invalid request data',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  logger.error({ requestId, err: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected error occurred',
    requestId,
  });
}
