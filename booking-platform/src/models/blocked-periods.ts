import { db } from '../config/db.ts';
import type { Interval } from '../helpers/time.ts';

/** Blocks that overlap [from, to). Touching at the edge does not count. */
export const findOverlapping = (
  providerId: number,
  from: Date,
  to: Date,
): Promise<Interval[]> =>
  db.manyOrNone<Interval>(
    `SELECT start_at as "start", end_at as "end"
       FROM blocked_periods
      WHERE provider_id = $1 AND start_at < $3 AND end_at > $2`,
    [providerId, from, to],
  );
