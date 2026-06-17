import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${timeInMs}ms`);
  });

  next();
};
