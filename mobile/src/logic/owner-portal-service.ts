import { setAppMode } from '@/data/app-mode';
import {
  isValidEmail,
  myOwnedRestaurantIds,
} from '@/data/auth';
import {
  loadOwnerApplicationDraft,
  loadOwnerRestaurantDrafts,
  saveOwnerApplicationDraft,
  saveOwnerRestaurantDrafts,
  type ApplicationDraft,
  type RestaurantDraft,
} from '@/data/owner-drafts-store';
import type { Restaurant } from '@/data/types';
import { listRestaurants } from '@/logic/restaurant-service';

export const EMPTY_APPLICATION_DRAFT: ApplicationDraft = {
  kind: 'existing',
  existingRestaurantId: '',
  businessNameKo: '',
  businessName: '',
  ownerName: '',
  email: '',
  address: '',
  phone: '',
  message: '',
  halalClaim: 'not_claiming',
};

export function isValidOwnerEmail(email: string): boolean {
  return isValidEmail(email);
}

export function createRestaurantDraft(restaurant: Restaurant): RestaurantDraft {
  return {
    nameKo: restaurant.nameKo,
    nameEn: restaurant.nameEn,
    address: restaurant.address,
    phone: restaurant.phone,
    originText: restaurant.origin
      .map((item) => `${item.itemKo}: ${item.country}`)
      .join('\n'),
    dishes: restaurant.dishes.map((dish) => ({
      id: dish.id,
      nameKo: dish.nameKo,
      nameEn: dish.nameEn,
      priceWon: String(dish.priceWon),
      contains: dish.contains.join(', '),
      mayContain: dish.mayContain.join(', '),
      leaveOutKo: dish.leaveOutKo ?? '',
      leaveOutEn: dish.leaveOutEn ?? '',
    })),
  };
}

export async function loadOwnerDrafts(ownerKey: string): Promise<{
  application: ApplicationDraft;
  restaurantDrafts: Record<string, RestaurantDraft>;
}> {
  const [application, restaurantDrafts] = await Promise.all([
    loadOwnerApplicationDraft(ownerKey),
    loadOwnerRestaurantDrafts(ownerKey),
  ]);

  return {
    application: application
      ? { ...EMPTY_APPLICATION_DRAFT, ...application }
      : EMPTY_APPLICATION_DRAFT,
    restaurantDrafts,
  };
}

export function saveApplicationDraft(
  ownerKey: string,
  draft: ApplicationDraft,
): Promise<void> {
  return saveOwnerApplicationDraft(ownerKey, draft);
}

export function saveRestaurantDrafts(
  ownerKey: string,
  drafts: Record<string, RestaurantDraft>,
): Promise<void> {
  return saveOwnerRestaurantDrafts(ownerKey, drafts);
}

export async function loadOwnerPortalRestaurants(previewMode: boolean): Promise<{
  restaurants: Restaurant[];
  ownedRestaurants: Restaurant[];
}> {
  const restaurants = await listRestaurants();
  if (previewMode) {
    return { restaurants, ownedRestaurants: restaurants.slice(0, 1) };
  }

  const ownedIds = await myOwnedRestaurantIds();
  return {
    restaurants,
    ownedRestaurants: restaurants.filter((restaurant) => ownedIds.includes(restaurant.id)),
  };
}

export function switchToUserMode(): Promise<void> {
  return setAppMode('user');
}


export type { ApplicationDraft, DishDraft, RestaurantDraft } from '@/data/owner-drafts-store';
