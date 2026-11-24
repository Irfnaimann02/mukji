export const RESTAURANT_PHOTO_MAX_COUNT = 5;
export const RESTAURANT_PHOTO_MAX_BYTES = 8 * 1024 * 1024;

export const OPENING_DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const;

export type OpeningDayKey = (typeof OPENING_DAYS)[number]['key'];
export type DayOpeningHours = { open: string; close: string };
export type WeeklyOpeningHours = Partial<Record<OpeningDayKey, DayOpeningHours>>;

export type RestaurantManagementProfile = {
  id: string;
  nameKo: string;
  nameEn: string;
  category: string;
  address: string;
  phone: string;
  latitude: string;
  longitude: string;
  description: string;
  reservationUrl: string;
  openingHours: WeeklyOpeningHours;
  closedDays: OpeningDayKey[];
  facilities: string[];
};

export type RestaurantPhoto = {
  id: string;
  url: string;
  altText: string;
  storagePath: string;
};

export type RestaurantManagementError =
  | 'nameKo'
  | 'nameEn'
  | 'category'
  | 'address'
  | 'phone'
  | 'latitude'
  | 'longitude'
  | 'description'
  | 'reservationUrl'
  | 'openingHours'
  | 'closedDays'
  | 'facilities';

export function emptyOpeningHours(): WeeklyOpeningHours {
  return {};
}

export function openingHoursFromUnknown(value: unknown): WeeklyOpeningHours {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: WeeklyOpeningHours = {};
  for (const day of OPENING_DAYS) {
    const candidate = (value as Record<string, unknown>)[day.key];
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const record = candidate as Record<string, unknown>;
    const open = typeof record.open === 'string' ? record.open : '';
    const close = typeof record.close === 'string' ? record.close : '';
    if (open || close) result[day.key] = { open, close };
  }
  return result;
}

export function stringArrayFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function validateRestaurantManagementProfile(
  profile: RestaurantManagementProfile,
): RestaurantManagementError | null {
  if (profile.nameKo.trim().length < 2 || profile.nameKo.trim().length > 160) return 'nameKo';
  if (profile.nameEn.trim().length < 2 || profile.nameEn.trim().length > 160) return 'nameEn';
  const category = profile.category.trim();
  if ((category.length > 0 && category.length < 2) || category.length > 80) return 'category';
  if (profile.address.trim().length < 5 || profile.address.trim().length > 500) return 'address';
  const phone = profile.phone.trim();
  if ((phone.length > 0 && phone.length < 7) || phone.length > 30) return 'phone';

  const latitude = Number(profile.latitude);
  if (!profile.latitude.trim() || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return 'latitude';
  }
  const longitude = Number(profile.longitude);
  if (!profile.longitude.trim() || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return 'longitude';
  }

  if (profile.description.length > 2000) return 'description';
  const reservationUrl = profile.reservationUrl.trim();
  if (reservationUrl) {
    if (reservationUrl.length > 500) return 'reservationUrl';
    try {
      const parsed = new URL(reservationUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return 'reservationUrl';
    } catch {
      return 'reservationUrl';
    }
  }

  for (const day of OPENING_DAYS) {
    if (profile.closedDays.includes(day.key)) continue;
    const hours = profile.openingHours[day.key];
    if (!hours) continue;
    const open = hours.open.trim();
    const close = hours.close.trim();
    if ((!open && close) || (open && !close)) return 'openingHours';
    if (open && (!isClockTime(open) || !isClockTime(close))) return 'openingHours';
  }

  const allowedDays = new Set(OPENING_DAYS.map((day) => day.key));
  if (profile.closedDays.some((day) => !allowedDays.has(day))) return 'closedDays';
  if (profile.facilities.length > 20) return 'facilities';
  if (profile.facilities.some((item) => !item.trim() || item.trim().length > 60)) return 'facilities';
  return null;
}

export function isClockTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function splitFacilityText(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
}
