import { type Request, type Response, type NextFunction } from 'express';
import { HttpError } from '../errors.ts';

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = err instanceof HttpError ? err.status : 500;

  if (status >= 500) console.error(err);

  if (res.headersSent) return next(err);

  res.status(status).json({
    message: status >= 500 ? 'Internal Server Error' : err.message,
  });
};

export default errorHandler;
