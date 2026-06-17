import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import logger from '../../utils/logger';
import { env } from '../../config';
import { ZodError } from 'zod';

export const errorHandler = (err: Error | AppError | ZodError, req: Request, res: Response, next: NextFunction) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors;
  }

  if (env.NODE_ENV === 'development') {
    if (statusCode === 500) {
      logger.error(`[Error] ${statusCode} - ${err.message}`, { stack: err.stack });
    } else {
      logger.debug(`[Error] ${statusCode} - ${err.message}`);
    }
  } else if (statusCode === 500) {
    logger.error(`[Error] ${statusCode} - ${err.message}`);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(errors && { errors }),
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
