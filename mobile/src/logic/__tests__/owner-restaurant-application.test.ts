import { describe, expect, it } from '@jest/globals';

import {
  emptyOwnerRestaurantApplication,
  validateOwnerRestaurantApplication,
} from '../owner-restaurant-application';

const validNewApplication = {
  ...emptyOwnerRestaurantApplication(),
  restaurantNameKo: '테스트 식당',
  restaurantNameEn: 'Test Restaurant',
  category: 'Korean restaurant',
  address: '경기도 안산시 상록구 테스트로 1',
  phone: '031-123-4567',
};

describe('owner restaurant application validation', () => {
  it('accepts a complete new restaurant application', () => {
    expect(validateOwnerRestaurantApplication(validNewApplication)).toBeNull();
  });

  it('requires a Korean and English name for a new restaurant', () => {
    expect(validateOwnerRestaurantApplication({ ...validNewApplication, restaurantNameKo: '' }))
      .toBe('restaurantNameKo');
    expect(validateOwnerRestaurantApplication({ ...validNewApplication, restaurantNameEn: '' }))
      .toBe('restaurantNameEn');
  });

  it('requires category, address and a valid contact number', () => {
    expect(validateOwnerRestaurantApplication({ ...validNewApplication, category: '' })).toBe('category');
    expect(validateOwnerRestaurantApplication({ ...validNewApplication, address: 'Seoul' })).toBe('address');
    expect(validateOwnerRestaurantApplication({ ...validNewApplication, phone: '123' })).toBe('phone');
  });

  it('limits the optional description to the database column length', () => {
    expect(validateOwnerRestaurantApplication({ ...validNewApplication, description: 'x'.repeat(2001) }))
      .toBe('description');
  });

  it('requires an existing restaurant selection for a claim', () => {
    expect(validateOwnerRestaurantApplication({
      ...emptyOwnerRestaurantApplication(),
      kind: 'claim',
    })).toBe('restaurantSelection');
  });

  it('accepts a selected existing restaurant without requiring new-listing fields', () => {
    expect(validateOwnerRestaurantApplication({
      ...emptyOwnerRestaurantApplication(),
      kind: 'claim',
      existingRestaurantId: 'restaurant-123',
    })).toBeNull();
  });
});
