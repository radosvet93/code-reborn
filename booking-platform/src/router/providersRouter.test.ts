import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type pg from 'pg';
import { app } from '../app.ts';
import { connect, truncateAll } from '../db/test-helpers.ts';

const ZONE = 'Europe/Sofia';

/**
 * The next occurrence of an ISO weekday (1 = Monday). Computed rather than
 * hardcoded, because the route filters out slots in the past, so a fixed date
 * would quietly start returning nothing once it slipped by.
 */
const nextWeekday = (isoDayOfWeek: number): string => {
  const today = Temporal.Now.plainDateISO(ZONE);
  const ahead = ((isoDayOfWeek - today.dayOfWeek + 7) % 7) || 7;
  return today.add({ days: ahead }).toString();
};

/** An instant rendered as HH:MM in the provider's own zone. */
const inProviderZone = (iso: string): string =>
  Temporal.Instant.from(iso).toZonedDateTimeISO(ZONE).toPlainTime().toString().slice(0, 5);

let db: pg.Client;
let providerId: number;
let serviceId: number;

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  await db.end();
});

beforeEach(async () => {
  await truncateAll(db);

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

  // Mondays only, 09:00 to 17:00 local. Postgres weekday 1 is Monday.
  await db.query(
    "insert into availability_rules (provider_id, day_of_week, start_time, end_time) values ($1, 1, '09:00', '17:00')",
    [providerId],
  );
});

const getAvailability = (date: string, service = serviceId) =>
  request(app).get(`/providers/${providerId}/availability`).query({ date, serviceId: service });

describe('GET /providers/:providerId/availability', () => {
  it('returns the free slots for a working day', async () => {
    const res = await getAvailability(nextWeekday(1)).expect('Content-Type', /json/).expect(200);

    // 09:00 to 15:00 local at 30 minute steps. 15:30 would run past 17:00.
    expect(res.body.slots).toHaveLength(13);
    expect(inProviderZone(res.body.slots[0])).toBe('09:00');
    expect(inProviderZone(res.body.slots.at(-1))).toBe('15:00');
  });

  it('returns nothing for a day the provider does not work', async () => {
    const res = await getAvailability(nextWeekday(7)).expect(200);

    expect(res.body.slots).toStrictEqual([]);
  });

  it('hides slots taken by an existing booking', async () => {
    const monday = nextWeekday(1);
    const at = (time: string) =>
      new Date(
        Temporal.PlainDate.from(monday)
          .toZonedDateTime({ timeZone: ZONE, plainTime: time })
          .epochMilliseconds,
      );

    await db.query(
      `insert into bookings
         (provider_id, service_id, customer_name, customer_email, customer_phone, start_at, end_at)
       values ($1, $2, 'Ada', 'ada@example.com', '0700000000', $3, $4)`,
      [providerId, serviceId, at('10:00'), at('12:00')],
    );

    const res = await getAvailability(monday).expect(200);
    const local = res.body.slots.map(inProviderZone);

    expect(local).not.toContain('11:30');
    expect(local).toContain('12:00'); // starts exactly as the booking ends
  });

  it('404s a service belonging to another provider', async () => {
    const other = await db.query(
      "insert into providers (name, timezone) values ('Other', 'Europe/London') returning id",
    );
    const otherService = await db.query(
      "insert into services (provider_id, name, duration_minutes) values ($1, 'Other', 60) returning id",
      [other.rows[0].id],
    );

    const res = await getAvailability(nextWeekday(1), otherService.rows[0].id).expect(404);

    expect(res.body).toStrictEqual({ message: 'Service not found' });
  });

  it('400s a date that does not exist, naming the field', async () => {
    const res = await getAvailability('2026-02-30').expect(400);

    expect(res.body).toStrictEqual({
      message: 'Invalid request',
      details: [{ path: 'query.date', message: 'expected an existing YYYY-MM-DD date' }],
    });
  });
});
