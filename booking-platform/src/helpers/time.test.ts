import { it, describe, expect, vi, afterEach } from 'vitest';
import { freeTimeSlots } from './time.ts';

const iso = (slots: Date[]) => slots.map((d) => d.toISOString());

const sofiaMonday = {
  timezone: 'Europe/Sofia',
  date: '2026-09-21',
  workingHours: ['09:00', '17:00'] as [string, string],
  durationInMinutes: 120,
  // Well before the day in question, so nothing is filtered as past.
  now: new Date('2026-09-01T00:00:00Z'),
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('freeTimeSlots', () => {
  it('offers 09:00 to 15:00 local, as instants, for a 2 hour session', () => {
    // Sofia is UTC+3 on this date, so 09:00 local is 06:00Z.
    // 15:30 is absent because a 2 hour session would run past 17:00.
    expect(iso(freeTimeSlots(sofiaMonday))).toStrictEqual([
      '2026-09-21T06:00:00.000Z',
      '2026-09-21T06:30:00.000Z',
      '2026-09-21T07:00:00.000Z',
      '2026-09-21T07:30:00.000Z',
      '2026-09-21T08:00:00.000Z',
      '2026-09-21T08:30:00.000Z',
      '2026-09-21T09:00:00.000Z',
      '2026-09-21T09:30:00.000Z',
      '2026-09-21T10:00:00.000Z',
      '2026-09-21T10:30:00.000Z',
      '2026-09-21T11:00:00.000Z',
      '2026-09-21T11:30:00.000Z',
      '2026-09-21T12:00:00.000Z',
    ]);
  });

  it('uses the provider timezone, not a fixed offset', () => {
    const london = iso(freeTimeSlots({ ...sofiaMonday, timezone: 'Europe/London' }));

    expect(london).toHaveLength(13);
    expect(london[0]).toBe('2026-09-21T08:00:00.000Z');
    expect(london.at(-1)).toBe('2026-09-21T14:00:00.000Z');
  });

  it('drops slots covered by a block', () => {
    // Block runs 09:00-11:00 London local, so the first survivor is 11:00
    // local (10:00Z), which starts the instant the block ends.
    const london = iso(freeTimeSlots({
      ...sofiaMonday,
      timezone: 'Europe/London',
      blocks: [{ start: '09:00', end: '11:00' }],
    }));

    expect(london).toHaveLength(9);
    expect(london[0]).toBe('2026-09-21T10:00:00.000Z');
    expect(london.at(-1)).toBe('2026-09-21T14:00:00.000Z');
  });

  it('drops slots that collide with an existing booking', () => {
    // Spec section 8: an existing 10:00-12:00 booking rejects 11:30-12:30
    // but allows 12:00-14:00.
    const slots = iso(freeTimeSlots({
      ...sofiaMonday,
      bookings: [{ start: '10:00', end: '12:00' }],
    }));

    expect(slots).toHaveLength(7);
    expect(slots[0]).toBe('2026-09-21T09:00:00.000Z');  // 12:00 Sofia
    expect(slots).not.toContain('2026-09-21T08:30:00.000Z'); // 11:30 Sofia
  });

  it('ignores the system timezone', () => {
    const expected = iso(freeTimeSlots(sofiaMonday));

    vi.stubEnv('TZ', 'Pacific/Kiritimati');

    expect(iso(freeTimeSlots(sofiaMonday))).toStrictEqual(expected);
  });

  it('keeps the minutes of a duration that is not a whole hour', () => {
    const slots = iso(freeTimeSlots({ ...sofiaMonday, durationInMinutes: 90 }));

    // 15:30 local fits, since 15:30 + 90min is exactly 17:00.
    expect(slots.at(-1)).toBe('2026-09-21T12:30:00.000Z');
  });

  it('does not offer slots that have already started', () => {
    // 09:15Z is 12:15 in Sofia, so everything up to and including 12:00
    // local has gone.
    const slots = iso(freeTimeSlots({
      ...sofiaMonday,
      now: new Date('2026-09-21T09:15:00Z'),
    }));

    expect(slots).toHaveLength(6);
    expect(slots[0]).toBe('2026-09-21T09:30:00.000Z');
  });

  it('still offers a slot starting at this exact moment', () => {
    const slots = iso(freeTimeSlots({
      ...sofiaMonday,
      now: new Date('2026-09-21T09:00:00Z'),
    }));

    expect(slots[0]).toBe('2026-09-21T09:00:00.000Z');
  });

  it('rejects working hours that are not HH:MM', () => {
    expect(() => freeTimeSlots({ ...sofiaMonday, workingHours: ['9', '17'] }))
      .toThrow(RangeError);
  });
});
