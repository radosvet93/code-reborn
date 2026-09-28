import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type pg from 'pg';
import { app } from '../app.ts';
import { connect, truncateAll } from '../db/test-helpers.ts';

const ZONE = 'Europe/Sofia';

/** The next occurrence of an ISO weekday, so tests never drift into the past. */
const nextWeekday = (isoDayOfWeek: number): Temporal.PlainDate => {
  const today = Temporal.Now.plainDateISO(ZONE);
  const ahead = ((isoDayOfWeek - today.dayOfWeek + 7) % 7) || 7;
  return today.add({ days: ahead });
};

let db: pg.Client;
let providerId: number;
let serviceId: number;
let monday: Temporal.PlainDate;

/** An instant from a local wall clock time on the seeded Monday. */
const at = (time: string): string =>
  new Date(
    monday.toZonedDateTime({ timeZone: ZONE, plainTime: time }).epochMilliseconds,
  ).toISOString();

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  await db.end();
});

beforeEach(async () => {
  await truncateAll(db);
  monday = nextWeekday(1);

  const provider = await db.query(
    'insert into providers (name, timezone) values ($1, $2) returning id',
    ['Test', ZONE],
  );
  providerId = provider.rows[0].id;

  const service = await db.query(
    "insert into services (provider_id, name, duration_minutes) values ($1, 'Family session', 120) returning id",
    [providerId],
  );
  serviceId = service.rows[0].id;

  await db.query(
    "insert into availability_rules (provider_id, day_of_week, start_time, end_time) values ($1, 1, '09:00', '17:00')",
    [providerId],
  );
});

const post = (overrides: Record<string, unknown> = {}) =>
  request(app)
    .post('/bookings')
    .send({
      providerId,
      serviceId,
      startAt: at('10:00'),
      customerName: 'Ada Lovelace',
      customerEmail: 'ada@example.com',
      customerPhone: '0700000001',
      ...overrides,
    });

describe('POST /bookings', () => {
  it('creates a booking and derives the end from the service duration', async () => {
    const res = await post().expect('Content-Type', /json/).expect(201);

    expect(res.body.id).toBeGreaterThan(0);
    expect(res.body.startAt).toBe(at('10:00'));
    expect(res.body.endAt).toBe(at('12:00')); // 120 minutes later
    expect(res.body.service).toBe('Family session');
  });

  it('ignores an endAt sent by the client', async () => {
    const res = await post({ endAt: at('18:00') }).expect(201);

    expect(res.body.endAt).toBe(at('12:00'));
  });

  it('409s the second booking of the same slot', async () => {
    await post().expect(201);

    const res = await post({ customerEmail: 'bob@example.com' }).expect(409);

    expect(res.body).toStrictEqual({ message: 'That time is no longer available' });
  });

  it('allows a booking that starts exactly when another ends', async () => {
    await post().expect(201);
    await post({ startAt: at('12:00') }).expect(201);
  });

  it('422s a time outside working hours', async () => {
    const res = await post({ startAt: at('03:00') }).expect(422);

    expect(res.body).toStrictEqual({ message: 'Not an available time' });
  });

  it('422s a time that is off the slot grid', async () => {
    await post({ startAt: at('10:07') }).expect(422);
  });

  it('422s a day the provider does not work', async () => {
    const sunday = nextWeekday(7);
    const startAt = new Date(
      sunday.toZonedDateTime({ timeZone: ZONE, plainTime: '10:00' }).epochMilliseconds,
    ).toISOString();

    await post({ startAt }).expect(422);
  });

  it('409s a time inside a blocked period', async () => {
    await db.query(
      'insert into blocked_periods (provider_id, name, start_at, end_at) values ($1, $2, $3, $4)',
      [providerId, 'Dentist', at('09:30'), at('11:00')],
    );

    await post().expect(409);
  });

  it('404s a service belonging to another provider', async () => {
    const other = await db.query(
      "insert into providers (name, timezone) values ('Other', 'Europe/London') returning id",
    );
    const otherService = await db.query(
      "insert into services (provider_id, name, duration_minutes) values ($1, 'Other', 120) returning id",
      [other.rows[0].id],
    );

    const res = await post({ serviceId: otherService.rows[0].id }).expect(404);

    expect(res.body).toStrictEqual({ message: 'Service not found' });
  });

  it('400s a bad email, naming the field', async () => {
    const res = await post({ customerEmail: 'not-an-email' }).expect(400);

    expect(res.body.message).toBe('Invalid request');
    expect(res.body.details).toContainEqual(
      expect.objectContaining({ path: 'body.customerEmail' }),
    );
  });

  it('400s a startAt that is not an instant', async () => {
    await post({ startAt: monday.toString() }).expect(400);
  });
});
