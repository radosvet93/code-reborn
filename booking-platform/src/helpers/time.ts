/** A range of local wall clock times on the day being asked about. */
export type Interval = { start: string; end: string };

export type FreeTimeSlotsParams = {
  /** Zone the provider works in, e.g. "Europe/Sofia". */
  timezone: string;
  /** Calendar date in the provider's zone, e.g. "2026-09-21". */
  date: string;
  /** Working hours as local time, e.g. ["09:00", "17:00"]. */
  workingHours: [string, string];
  durationInMinutes: number;
  /** Current moment. Passed in, never read from the clock, so this stays testable. */
  now: Date;
  stepInMinutes?: number;
  blocks?: Interval[];
  bookings?: Interval[];
};

const DEFAULT_STEP_MINUTES = 30;

/** True when two ranges share any time. Ranges that merely touch do not. */
const overlap = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean => aStart < bEnd && bStart < aEnd;

export const freeTimeSlots = ({
  timezone,
  date,
  workingHours,
  durationInMinutes,
  now,
  stepInMinutes = DEFAULT_STEP_MINUTES,
  blocks = [],
  bookings = [],
}: FreeTimeSlotsParams): Date[] => {
  const day = Temporal.PlainDate.from(date);

  const at = (time: string) =>
    day.toZonedDateTime({
      timeZone: timezone,
      plainTime: Temporal.PlainTime.from(time),
    });

  const opens = at(workingHours[0]);
  const closes = at(workingHours[1]);

  // A block and a booking mean the same thing here: this range is taken.
  const taken = [...blocks, ...bookings].map((interval) => ({
    start: at(interval.start).epochMilliseconds,
    end: at(interval.end).epochMilliseconds,
  }));

  const nowMs = now.getTime();

  const slots: Date[] = [];

  // A session must finish by closing time, so the last start is the last
  // point on the grid where start + duration still fits.
  for (
    let start = opens;
    Temporal.ZonedDateTime.compare(start.add({ minutes: durationInMinutes }), closes) <= 0;
    start = start.add({ minutes: stepInMinutes })
  ) {
    const slotStart = start.epochMilliseconds;
    const slotEnd = start.add({ minutes: durationInMinutes }).epochMilliseconds;

    const isTaken = taken.some((t) => overlap(slotStart, slotEnd, t.start, t.end));

    // A slot that has already started cannot be booked.
    const hasPassed = slotStart < nowMs;

    if (!isTaken && !hasPassed) slots.push(new Date(slotStart));
  }

  return slots;
};
