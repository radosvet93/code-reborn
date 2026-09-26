import pg from 'pg';

import { connectionString } from '../config/db.ts';

/**
 * A dedicated connection, not a pooled one. Tests that race two writers need
 * two real connections, or they serialise and prove nothing.
 */
export const connect = async (): Promise<pg.Client> => {
  const client = new pg.Client({ connectionString: connectionString() });
  await client.connect();
  return client;
};

export const truncateAll = async (client: pg.Client): Promise<void> => {
  await client.query(
    'truncate bookings, availability_rules, blocked_periods, services, providers restart identity cascade',
  );
};
