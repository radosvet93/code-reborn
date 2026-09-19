import express, { type Express, type Request, type Response } from 'express';
import morgan from 'morgan';
import errorHandler from './middlewares/error.ts';

export const app: Express = express();

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.all(/.*/, (req: Request, res: Response) => {
  res.status(404).json({ message: 'Error' });
});

app.use(errorHandler)
