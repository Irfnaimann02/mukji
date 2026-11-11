import type { FoodProfile, FoodType, Ingredient, Restaurant } from '@/data/types';
import type { Point } from '@/logic/nearby-service';
import { fadedForAllergies } from '@/logic/profile-filter';
import { listRestaurantsNear } from '@/logic/restaurant-service';

export type MapPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  foodType: FoodType;
  badges: string[];
  badgeCount: number;
  faded: boolean; // #14: no dish here is free of the user's allergens
  fromKakao: boolean; // #47: found with Kakao, no menu yet
};

const VEGAN_BLOCKED: Ingredient[] = ['pork', 'beef', 'chicken', 'seafood', 'egg', 'dairy'];

// "Who it fits" badges, worked out from what the restaurant serves.
// Adib's BadgeService (#8) can replace this later.
export function badgesFor(r: Restaurant): string[] {
  const badges: string[] = [];
  // No menu yet: we can't say who it fits, so show no badges.
  if (r.dishes.length === 0) return badges;
  const all = (d: Restaurant['dishes'][number]) => [...d.contains, ...d.mayContain];
  if (r.halalCertified) badges.push('halal');
  if (r.dishes.every((d) => !all(d).includes('pork'))) badges.push('no-pork');
  if (r.dishes.some((d) => !all(d).some((i) => VEGAN_BLOCKED.includes(i)))) {
    badges.push('vegan-option');
  }
  return badges;
}

export async function getMapPins(profile: FoodProfile, centre: Point): Promise<MapPin[]> {
  const restaurants = await listRestaurantsNear(centre.lat, centre.lng, profile.maxDistanceM);
  return restaurants.map((r) => {
    const badges = badgesFor(r);
    return {
      id: r.id,
      name: r.nameEn,
      latitude: r.lat,
      longitude: r.lng,
      foodType: r.foodType,
      badges,
      badgeCount: badges.length,
      faded: fadedForAllergies(r, profile),
      fromKakao: r.source === 'kakao',
    };
  });
}
