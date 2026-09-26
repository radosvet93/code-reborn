import { db } from '../config/db.ts';
import type { Interval } from '../helpers/time.ts';

/** Bookings that overlap [from, to). Touching at the edge does not count. */
export const findOverlapping = (
  providerId: number,
  from: Date,
  to: Date,
): Promise<Interval[]> =>
  db.manyOrNone<Interval>(
    `select start_at as "start", end_at as "end"
       from bookings
      where provider_id = $1 and start_at < $3 and end_at > $2`,
    [providerId, from, to],
  );
