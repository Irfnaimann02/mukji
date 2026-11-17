import { describe, expect, it } from '@jest/globals';

import {
  TIME_SLOTS,
  combine,
  formatBookingTime,
  formatDay,
  isInFuture,
  isSlotOpen,
  nextDays,
} from '@/logic/booking-times';

// #50 booking date and time helpers
describe('booking-times', () => {
  const now = new Date(2026, 10, 17, 20, 45); // Tue 17 Nov 2026, 20:45

  it('offers 11:00 to 21:00 every 30 minutes', () => {
    expect(TIME_SLOTS[0]).toBe('11:00');
    expect(TIME_SLOTS[TIME_SLOTS.length - 1]).toBe('21:00');
    expect(TIME_SLOTS).toHaveLength(21);
  });

  it('lists today and the following days', () => {
    const days = nextDays(now, 3);
    expect(days.map((d) => d.getDate())).toEqual([17, 18, 19]);
  });

  it('closes slots that are in the past or less than 30 minutes away', () => {
    const [today, tomorrow] = nextDays(now, 2);
    expect(isSlotOpen(today, '20:30', now)).toBe(false);
    expect(isSlotOpen(today, '21:00', now)).toBe(false); // only 15 minutes away
    expect(isSlotOpen(tomorrow, '11:00', now)).toBe(true);
  });

  it('formats a day and a booking time in English and Korean', () => {
    const [, tomorrow] = nextDays(now, 2);
    const iso = combine(tomorrow, '18:30').toISOString();
    expect(formatDay(tomorrow, 'en')).toBe('Wed 18 Nov');
    expect(formatDay(tomorrow, 'ko')).toBe('11월 18일 (수)');
    expect(formatBookingTime(iso, 'en')).toBe('Wed 18 Nov, 18:30');
    expect(formatBookingTime(iso, 'ko')).toBe('11월 18일 (수) 18:30');
    expect(isInFuture(iso, now)).toBe(true);
  });
});
