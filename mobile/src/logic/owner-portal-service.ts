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
import { listRestaurantsByIds } from '@/logic/restaurant-service';


const PREVIEW_RESTAURANT: Restaurant = {
  id: 'mukji-owner-preview-restaurant',
  nameKo: '살람 키친',
  nameEn: 'Salam Kitchen',
  foodType: 'halal',
  lat: 37.303,
  lng: 126.838,
  address: 'Ansan, Gyeonggi-do, South Korea',
  phone: '031-000-0000',
  featuredDishNameEn: 'Korean beef rice bowl',
  featuredDishImageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&auto=format&fit=crop&q=85',
  priceLevel: 2,
  halalCertified: false,
  origin: [
    { itemKo: '소고기', country: 'Australia' },
    { itemKo: '닭고기', country: 'Korea' },
  ],
  recommendCount: 128,
  rating: 4.8,
  sources: ['preview'],
  dishes: [
    { id: 'preview-bulgogi', nameKo: '불고기 덮밥', nameEn: 'Bulgogi Rice Bowl', priceWon: 12000, contains: ['beef', 'soy', 'wheat'], mayContain: [], verifiedCount: 0, lastChecked: null, menuCategory: 'main', isAvailable: true, photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&auto=format&fit=crop&q=85' },
    { id: 'preview-chicken', nameKo: '양념 치킨', nameEn: 'Korean Fried Chicken', priceWon: 16000, contains: ['chicken', 'wheat'], mayContain: ['soy'], verifiedCount: 0, lastChecked: null, menuCategory: 'main', isAvailable: true, photoUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=700&auto=format&fit=crop&q=85' },
    { id: 'preview-noodles', nameKo: '비빔면', nameEn: 'Spicy Mixed Noodles', priceWon: 9500, contains: ['wheat', 'soy'], mayContain: [], verifiedCount: 0, lastChecked: null, menuCategory: 'main', isAvailable: true, photoUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&auto=format&fit=crop&q=85' },
    { id: 'preview-drink', nameKo: '레몬 에이드', nameEn: 'Lemon Ade', priceWon: 5000, contains: [], mayContain: [], verifiedCount: 0, lastChecked: null, menuCategory: 'drink', isAvailable: true, photoUrl: 'https://images.unsplash.com/photo-1513558161293-cce5f3d3b2f9?w=700&auto=format&fit=crop&q=85' },
  ],
};

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
  if (previewMode) {
    const restaurants = [PREVIEW_RESTAURANT];
    return { restaurants, ownedRestaurants: restaurants };
  }

  // Load the exact restaurants linked in public.owners. This also supports
  // approved bulk-import listings; filtering the short hand-curated list
  // would silently hide any owned restaurant outside that list.
  const ownedIds = await myOwnedRestaurantIds();
  const ownedRestaurants = await listRestaurantsByIds(ownedIds);
  return { restaurants: ownedRestaurants, ownedRestaurants };
}

export function switchToUserMode(): Promise<void> {
  return setAppMode('user');
}


export type { ApplicationDraft, DishDraft, RestaurantDraft } from '@/data/owner-drafts-store';
