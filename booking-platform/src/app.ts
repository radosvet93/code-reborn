import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import morgan from 'morgan';
import errorHandler from './middlewares/error.ts';
import { HttpError } from './errors.ts';

export const app: Express = express();

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.all(/.*/, (req: Request, res: Response, next: NextFunction) => {
  next(new HttpError(404, 'Not Found'));
});

app.use(errorHandler);
