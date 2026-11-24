import type { OwnerRestaurantApplicationInput } from '@/data/owner-restaurant-application-repository';

export type OwnerRestaurantApplicationValidationError =
  | 'restaurantSelection'
  | 'restaurantNameKo'
  | 'restaurantNameEn'
  | 'category'
  | 'address'
  | 'phone'
  | 'description';

export function emptyOwnerRestaurantApplication(): OwnerRestaurantApplicationInput {
  return {
    kind: 'new',
    existingRestaurantId: '',
    restaurantNameKo: '',
    restaurantNameEn: '',
    category: '',
    address: '',
    phone: '',
    description: '',
  };
}

export function validateOwnerRestaurantApplication(
  input: OwnerRestaurantApplicationInput,
): OwnerRestaurantApplicationValidationError | null {
  if (input.kind === 'claim') {
    return input.existingRestaurantId.trim() ? null : 'restaurantSelection';
  }
  if (input.restaurantNameKo.trim().length < 2 || input.restaurantNameKo.trim().length > 160) {
    return 'restaurantNameKo';
  }
  if (input.restaurantNameEn.trim().length < 2 || input.restaurantNameEn.trim().length > 160) {
    return 'restaurantNameEn';
  }
  if (input.category.trim().length < 2 || input.category.trim().length > 80) return 'category';
  if (input.address.trim().length < 6 || input.address.trim().length > 500) return 'address';
  const digits = input.phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15 || input.phone.trim().length > 30) return 'phone';
  if (input.description.trim().length > 2000) return 'description';
  return null;
}
