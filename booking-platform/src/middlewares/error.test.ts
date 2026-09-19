import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import errorHandler from './error.ts';
import { HttpError } from '../errors.ts';

const appThatFailsWith = (route: RequestHandler): Express => {
  const testApp = express();
  testApp.get('/boom', route);
  testApp.use(errorHandler);
  return testApp;
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('errorHandler', () => {
  it('turns an unexpected throw into a 500 without leaking the message', async () => {
    const res = await request(appThatFailsWith(() => {
      throw new Error('password authentication failed for user "booking"');
    }))
      .get('/boom')
      .expect('Content-Type', /json/)
      .expect(500);

    expect(res.body).toStrictEqual({ message: 'Internal Server Error' });
  });

  it('turns a rejected async handler into a 500', async () => {
    const res = await request(appThatFailsWith(async () => {
      throw new Error('insert failed');
    }))
      .get('/boom')
      .expect(500);

    expect(res.body).toStrictEqual({ message: 'Internal Server Error' });
  });

  it('uses the status and message of an HttpError', async () => {
    const res = await request(appThatFailsWith(() => {
      throw new HttpError(409, 'That time was just booked');
    }))
      .get('/boom')
      .expect('Content-Type', /json/)
      .expect(409);

    expect(res.body).toStrictEqual({ message: 'That time was just booked' });
  });

  it('leaves a response that has already been sent alone', async () => {
    const res = await request(appThatFailsWith((req, res) => {
      res.status(200).json({ partial: true });
      throw new Error('failed after the response started');
    }))
      .get('/boom')
      .expect(200);

    expect(res.body).toStrictEqual({ partial: true });
  });
});
