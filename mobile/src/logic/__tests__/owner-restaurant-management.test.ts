import { describe, expect, it } from '@jest/globals';
import {
  OPENING_DAYS,
  openingHoursFromUnknown,
  splitFacilityText,
  validateRestaurantManagementProfile,
  type RestaurantManagementProfile,
} from '../owner-restaurant-management';

function profile(overrides: Partial<RestaurantManagementProfile> = {}): RestaurantManagementProfile {
  return {
    id: 'r01',
    nameKo: '테스트 음식점',
    nameEn: 'Test Restaurant',
    category: '한식',
    address: 'Ansan, Gyeonggi-do, South Korea',
    phone: '031-000-0000',
    latitude: '37.3',
    longitude: '126.8',
    description: '',
    reservationUrl: '',
    openingHours: { mon: { open: '09:00', close: '18:00' } },
    closedDays: ['sun'],
    facilities: ['Takeaway'],
    ...overrides,
  };
}

describe('owner restaurant management validation', () => {
  it('accepts a complete profile with valid coordinates and weekly hours', () => {
    expect(validateRestaurantManagementProfile(profile())).toBeNull();
  });

  it('allows an unknown category and phone to remain blank', () => {
    expect(validateRestaurantManagementProfile(profile({ category: '', phone: '' }))).toBeNull();
  });

  it('rejects coordinates outside geographic bounds', () => {
    expect(validateRestaurantManagementProfile(profile({ latitude: '91' }))).toBe('latitude');
    expect(validateRestaurantManagementProfile(profile({ longitude: '-181' }))).toBe('longitude');
  });

  it('requires opening and closing times together in 24-hour format', () => {
    expect(validateRestaurantManagementProfile(profile({ openingHours: { mon: { open: '09:00', close: '' } } }))).toBe('openingHours');
    expect(validateRestaurantManagementProfile(profile({ openingHours: { mon: { open: '25:00', close: '18:00' } } }))).toBe('openingHours');
  });

  it('rejects non-http reservation links and oversized descriptions', () => {
    expect(validateRestaurantManagementProfile(profile({ reservationUrl: 'javascript:alert(1)' }))).toBe('reservationUrl');
    expect(validateRestaurantManagementProfile(profile({ description: 'x'.repeat(2001) }))).toBe('description');
  });

  it('normalizes facility input without duplicates or blank values', () => {
    expect(splitFacilityText(' Takeaway, Prayer room, Takeaway, , Wheelchair access ')).toEqual([
      'Takeaway', 'Prayer room', 'Wheelchair access',
    ]);
  });

  it('reads only supported weekdays from saved opening hours', () => {
    expect(Object.keys(openingHoursFromUnknown({
      mon: { open: '09:00', close: '18:00' },
      holiday: { open: '10:00', close: '14:00' },
      tue: 'closed',
    }))).toEqual(['mon']);
    expect(OPENING_DAYS).toHaveLength(7);
  });
});
