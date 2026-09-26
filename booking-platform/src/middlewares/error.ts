import { type Request, type Response, type NextFunction } from 'express';
import { HttpError } from '../errors.ts';

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = err instanceof HttpError ? err.status : 500;

  if (status >= 500) console.error(err);

  // Response already started, so we cannot rewrite the status.
  // Express's default handler closes the connection.
  if (res.headersSent) return next(err);

  // Nothing about a server fault is safe to send out, message or details.
  if (status >= 500) {
    res.status(status).json({ message: 'Internal Server Error' });
    return;
  }

  const body: { message: string; details?: unknown } = { message: err.message };
  if (err instanceof HttpError && err.details !== undefined) body.details = err.details;

  res.status(status).json(body);
};

export default errorHandler;
