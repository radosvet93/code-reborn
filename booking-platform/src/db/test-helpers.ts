import pg from 'pg';

// Vitest does not load .env, and these helpers are only ever used from tests.
if (!process.env.DATABASE_URL) process.loadEnvFile('.env');

/** The dev connection string with "_test" appended to the database name. */
export const testDatabaseUrl = (): string => {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is not set');

  const url = new URL(raw);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
};

/**
 * A dedicated connection, not a pooled one. Tests that race two writers need
 * two real connections, or they serialise and prove nothing.
 */
export const connect = async (): Promise<pg.Client> => {
  const client = new pg.Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  return client;
};

export const truncateAll = async (client: pg.Client): Promise<void> => {
  await client.query(
    'truncate bookings, availability_rules, blocked_periods, services, providers restart identity cascade',
  );
};
