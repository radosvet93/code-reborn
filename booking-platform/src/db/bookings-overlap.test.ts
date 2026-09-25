import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type pg from 'pg';
import { connect, truncateAll } from './test-helpers.ts';

const INSERT_BOOKING = `
  insert into bookings
    (provider_id, service_id, customer_name, customer_email, customer_phone, start_at, end_at)
  values ($1, $2, 'Ada', 'ada@example.com', '0700000000', $3, $4)`;

let db: pg.Client;
let providerId: number;
let serviceId: number;

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  await db.end();
});

/** Inserts a provider, a service, and one existing booking of 10:00-12:00. */
beforeEach(async () => {
  await truncateAll(db);

  const provider = await db.query(
    "insert into providers (name, timezone) values ('Test', 'Europe/Sofia') returning id",
  );
  providerId = provider.rows[0].id;

  const service = await db.query(
    "insert into services (provider_id, name, duration_minutes) values ($1, 'Family session', 120) returning id",
    [providerId],
  );
  serviceId = service.rows[0].id;

  await book(db, '2026-09-21T10:00:00Z', '2026-09-21T12:00:00Z');
});

const book = (client: pg.Client, start: string, end: string, provider = providerId) =>
  client.query(INSERT_BOOKING, [provider, serviceId, start, end]);

describe('bookings overlap constraint', () => {
  // Catches: the constraint missing altogether.
  it('rejects a booking that overlaps an existing one', async () => {
    const error = await book(db, '2026-09-21T11:00:00Z', '2026-09-21T13:00:00Z')
      .then(() => null)
      .catch((e: pg.DatabaseError) => e);

    // 23P01 is exclusion_violation. Assert the code, never the message.
    expect(error?.code).toBe('23P01');
  });

  // Catches: a closed range instead of [), which would forbid back-to-back bookings.
  it('allows a booking that starts exactly when the other ends', async () => {
    await expect(book(db, '2026-09-21T12:00:00Z', '2026-09-21T14:00:00Z')).resolves.toBeDefined();
  });

  // Catches: a missing `provider_id WITH =`, which would let one provider's
  // booking block every other provider on the platform.
  it('allows a different provider at the same time', async () => {
    const other = await db.query(
      "insert into providers (name, timezone) values ('Other', 'Europe/London') returning id",
    );
    const otherService = await db.query(
      "insert into services (provider_id, name, duration_minutes) values ($1, 'Other', 120) returning id",
      [other.rows[0].id],
    );

    await expect(
      db.query(INSERT_BOOKING, [
        other.rows[0].id,
        otherService.rows[0].id,
        '2026-09-21T10:00:00Z',
        '2026-09-21T12:00:00Z',
      ]),
    ).resolves.toBeDefined();
  });

  // Catches: the guarantee not holding when two writers are in flight at once,
  // which is the only thing this layer can prove. Spec section 8.
  it('rejects the loser when two requests race for the same slot', async () => {
    const first = await connect();
    const second = await connect();

    try {
      await first.query('BEGIN');
      await second.query('BEGIN');

      await book(first, '2026-09-21T14:00:00Z', '2026-09-21T16:00:00Z');

      // Blocks here. Postgres holds the lock until `first` commits or rolls back.
      const secondResult = book(second, '2026-09-21T15:00:00Z', '2026-09-21T17:00:00Z')
        .then(() => null)
        .catch((error: pg.DatabaseError) => error);

      await first.query('COMMIT');

      expect((await secondResult)?.code).toBe('23P01');

      await second.query('ROLLBACK');
    } finally {
      await first.end();
      await second.end();
    }
  });
});
