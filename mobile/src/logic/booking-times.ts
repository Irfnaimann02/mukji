// #50 Pure date and time helpers for booking requests. No React, no Supabase.

export type BookingLanguage = 'ko' | 'en';

const WEEKDAYS: Record<BookingLanguage, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
};
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const BOOKING_DAYS_AHEAD = 14;
export const MIN_PEOPLE = 1;
export const MAX_PEOPLE = 20; // the database allows up to 50
const LEAD_MINUTES = 30; // a slot must be at least this far in the future

// 11:00 to 21:00, every 30 minutes.
export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let minutes = 11 * 60; minutes <= 21 * 60; minutes += 30) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
})();

// Slots grouped for the form: lunch before 14:00, dinner from 17:00.
export type TimeGroup = 'lunch' | 'afternoon' | 'dinner';
export const TIME_GROUPS: { key: TimeGroup; slots: string[] }[] = [
  { key: 'lunch', slots: TIME_SLOTS.filter((s) => s < '14:00') },
  { key: 'afternoon', slots: TIME_SLOTS.filter((s) => s >= '14:00' && s < '17:00') },
  { key: 'dinner', slots: TIME_SLOTS.filter((s) => s >= '17:00') },
];

// Today and the following days, each at local midnight.
export function nextDays(now: Date, count: number = BOOKING_DAYS_AHEAD): Date[] {
  return Array.from({ length: count }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
}

// A day plus an 'HH:MM' slot, in the phone's local time.
export function combine(day: Date, slot: string): Date {
  const [h, m] = slot.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

export function isSlotOpen(day: Date, slot: string, now: Date): boolean {
  return combine(day, slot).getTime() >= now.getTime() + LEAD_MINUTES * 60 * 1000;
}

// 'Tue 17 Nov' / '11월 17일 (화)'
export function formatDay(date: Date, language: BookingLanguage): string {
  const weekday = WEEKDAYS[language][date.getDay()];
  return language === 'ko'
    ? `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`
    : `${weekday} ${date.getDate()} ${MONTHS_EN[date.getMonth()]}`;
}

// 'Tue 17 Nov, 18:30' / '11월 17일 (화) 18:30'. Takes the ISO text saved in Supabase.
export function formatBookingTime(iso: string, language: BookingLanguage): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return language === 'ko' ? `${formatDay(date, language)} ${time}` : `${formatDay(date, language)}, ${time}`;
}

// 'HH:MM' in the phone's local time.
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// The three lines of a date block: WED / 18 / NOV, or 수 / 18 / 11월.
export function dateBlock(date: Date, language: BookingLanguage): { dow: string; day: string; month: string } {
  return {
    dow: language === 'ko' ? WEEKDAYS.ko[date.getDay()] : WEEKDAYS.en[date.getDay()].toUpperCase(),
    day: String(date.getDate()),
    month: language === 'ko' ? `${date.getMonth() + 1}월` : MONTHS_EN[date.getMonth()].toUpperCase(),
  };
}

// Short weekday for the date cards: 'Wed' / '수'.
export function weekdayShort(date: Date, language: BookingLanguage): string {
  return WEEKDAYS[language][date.getDay()];
}

export function isInFuture(iso: string, now: Date): boolean {
  return new Date(iso).getTime() > now.getTime();
}
