import { db } from '../config/db.ts';
import { HttpError } from '../errors.ts';
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

export type NewBooking = {
  providerId: number;
  serviceId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startAt: Date;
  endAt: Date;
};

export type Booking = { id: number; start_at: Date; end_at: Date };

/** Postgres raises this when the bookings exclusion constraint rejects a row. */
const EXCLUSION_VIOLATION = '23P01';

export const create = async (booking: NewBooking): Promise<Booking> => {
  try {
    return await db.one<Booking>(
      `insert into bookings
         (provider_id, service_id, customer_name, customer_email, customer_phone, start_at, end_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id, start_at, end_at`,
      [
        booking.providerId,
        booking.serviceId,
        booking.customerName,
        booking.customerEmail,
        booking.customerPhone,
        booking.startAt,
        booking.endAt,
      ],
    );
  } catch (error) {
    // The only layer that should know Postgres error codes is this one.
    if ((error as { code?: string }).code === EXCLUSION_VIOLATION) {
      throw new HttpError(409, 'That time is no longer available');
    }
    throw error;
  }
};
