import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../helpers/validate.ts';
import { freeTimeSlots } from '../helpers/time.ts';
import { HttpError } from '../errors.ts';
import { findById } from '../models/providers.ts';
import { findBookable } from '../models/services.ts';
import { findForWeekday } from '../models/availability-rules.ts';
import * as blockedPeriods from '../models/blocked-periods.ts';
import * as bookings from '../models/bookings.ts';

export const bookingsRouter = Router();

const bookingRequest = z.object({
  body: z.object({
    providerId: z.coerce.number().int().positive(),
    serviceId: z.coerce.number().int().positive(),
    /** One of the instants the availability endpoint handed out. */
    startAt: z.iso.datetime(),
    customerName: z.string().min(1),
    customerEmail: z.email(),
    // Deliberately loose. E.164 would reject "0700000001", which is how most
    // people write their own number.
    customerPhone: z.string().min(5),
  }),
});

bookingsRouter.post('/', async (req: Request, res: Response) => {
  const { body } = validate(bookingRequest, req);

  const provider = await findById(body.providerId);
  if (!provider) throw new HttpError(404, 'Provider not found');

  const service = await findBookable(body.providerId, body.serviceId);
  if (!service) throw new HttpError(404, 'Service not found');

  // The end is derived from the service, never taken from the client.
  const startInstant = Temporal.Instant.from(body.startAt);
  const startAt = new Date(startInstant.epochMilliseconds);
  const endAt = new Date(startInstant.add({ minutes: service.duration_minutes }).epochMilliseconds);

  // Which calendar day this is depends on the provider's zone, not the server's.
  const day = startInstant.toZonedDateTimeISO(provider.timezone).toPlainDate();

  // Postgres numbers weekdays 0-6 from Sunday, Temporal 1-7 from Monday.
  const rule = await findForWeekday(body.providerId, day.dayOfWeek % 7);
  if (!rule) throw new HttpError(422, 'Not an available time');

  const isRequested = (slots: Date[]) =>
    slots.some((slot) => slot.getTime() === startAt.getTime());

  const slotParams = {
    timezone: provider.timezone,
    date: day.toString(),
    workingHours: [rule.start_time, rule.end_time] as [string, string],
    durationInMinutes: service.duration_minutes,
    now: new Date(),
  };

  // Could this time ever be booked? Working hours, the slot grid, the past.
  // The exclusion constraint checks none of these, so nothing else would.
  if (!isRequested(freeTimeSlots(slotParams))) {
    throw new HttpError(422, 'Not an available time');
  }

  const dayStart = day.toZonedDateTime(provider.timezone);
  const from = new Date(dayStart.epochMilliseconds);
  const to = new Date(dayStart.add({ days: 1 }).epochMilliseconds);

  const [blocks, taken] = await Promise.all([
    blockedPeriods.findOverlapping(body.providerId, from, to),
    bookings.findOverlapping(body.providerId, from, to),
  ]);

  // It was a real slot, so is it still free? This is the stale booking page
  // from spec section 10, and it needs no concurrency at all to happen.
  if (!isRequested(freeTimeSlots({ ...slotParams, blocks, bookings: taken }))) {
    throw new HttpError(409, 'That time is no longer available');
  }

  // Two customers can both reach this line. Postgres decides who wins, and
  // create() turns its rejection into a 409.
  const booking = await bookings.create({
    providerId: body.providerId,
    serviceId: body.serviceId,
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    customerPhone: body.customerPhone,
    startAt,
    endAt,
  });

  res.status(201).json({
    id: booking.id,
    startAt: booking.start_at.toISOString(),
    endAt: booking.end_at.toISOString(),
    service: service.name,
  });
});
