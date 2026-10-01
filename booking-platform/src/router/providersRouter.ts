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

export const providersRouter = Router();

/** A date that really exists. A plain regex would accept 2026-02-30. */
const calendarDate = z.string().refine(
  (value) => {
    try {
      Temporal.PlainDate.from(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'expected an existing YYYY-MM-DD date' },
);

const availabilityRequest = z.object({
  params: z.object({
    providerId: z.coerce.number().int().positive(),
  }),
  query: z.object({
    date: calendarDate,
    serviceId: z.coerce.number().int().positive(),
  }),
});

providersRouter.get('/:providerId/availability', async (req: Request, res: Response) => {
  const { params, query } = validate(availabilityRequest, req);

  const provider = await findById(params.providerId);
  if (!provider) throw new HttpError(404, 'Provider not found');

  const service = await findBookable(params.providerId, query.serviceId);
  if (!service) throw new HttpError(404, 'Service not found');

  // Postgres numbers weekdays 0-6 from Sunday, Temporal 1-7 from Monday.
  const day = Temporal.PlainDate.from(query.date);
  const rule = await findForWeekday(params.providerId, day.dayOfWeek % 7);

  if (!rule) {
    res.json({ slots: [] });
    return;
  }

  // The day in the provider's zone, not the server's.
  const dayStart = day.toZonedDateTime(provider.timezone);
  const from = new Date(dayStart.epochMilliseconds);
  const to = new Date(dayStart.add({ days: 1 }).epochMilliseconds);

  const [blocks, taken] = await Promise.all([
    blockedPeriods.findOverlapping(params.providerId, from, to),
    bookings.findOverlapping(params.providerId, from, to),
  ]);

  const slots = freeTimeSlots({
    timezone: provider.timezone,
    date: query.date,
    workingHours: [rule.start_time, rule.end_time],
    durationInMinutes: service.duration_minutes,
    now: new Date(),
    blocks,
    bookings: taken,
  });

  res.json({ slots: slots.map((slot) => slot.toISOString()) });
});
