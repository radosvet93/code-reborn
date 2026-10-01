import { db } from '../config/db.ts';

/** start_time and end_time are local wall clock, e.g. "09:00:00". */
export type AvailabilityRule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

/** dayOfWeek uses Postgres numbering, where 0 is Sunday. */
export const findForWeekday = (
  providerId: number,
  dayOfWeek: number,
): Promise<AvailabilityRule | null> =>
  db.oneOrNone<AvailabilityRule>(
    `SELECT day_of_week, start_time, end_time
       FROM availability_rules
      WHERE provider_id = $1 AND day_of_week = $2`,
    [providerId, dayOfWeek],
  );
