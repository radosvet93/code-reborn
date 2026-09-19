import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './app.ts';

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toStrictEqual({ status: 'ok' });
  });
});

describe('unknown routes', () => {
  it('404s an unknown path', async () => {
    const res = await request(app)
      .get('/any-route')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(res.body).toStrictEqual({ message: 'Not Found' });
  });

  it('404s a known path with the wrong method', async () => {
    const res = await request(app)
      .post('/health')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(res.body).toStrictEqual({ message: 'Not Found' });
  });
});
