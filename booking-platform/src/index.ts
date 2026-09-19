import express, { type Express, type Request, type Response } from 'express';
import morgan from 'morgan';
import errorHandler from './middlewares/error.ts';

export const app: Express = express();

app.get('/health', (req: Request, res: Response) => {
  try {
    res.send({ status: 'ok' });
  } catch (error) {
    throw new Error('Cannot reach health status')
  }
});

app.use(morgan('common'));
app.use(errorHandler)

app.listen(3000);