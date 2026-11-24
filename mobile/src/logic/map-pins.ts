import type { FoodProfile, FoodType, Ingredient, Restaurant } from '@/data/types';
import type { Point } from '@/logic/nearby-service';
import { BLOCKED_BY_DIET, fadeReason, type FadeReason } from '@/logic/profile-filter';
import { listRestaurantsNear } from '@/logic/restaurant-service';

export type MapPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  foodType: FoodType;
  badges: string[];
  badgeCount: number;
  faded: boolean; // #14 + #4: nothing here fits the user (see fadedFor)
  fadedFor: FadeReason | null; // 'allergy' = every dish has an allergen, 'diet' = no dish is Safe, 'typical' = only a typical menu
  fromKakao: boolean; // #47: found with Kakao, no menu yet
};

// Same list the menu uses, so the two can never disagree.
const VEGAN_BLOCKED: Ingredient[] = BLOCKED_BY_DIET.vegan;

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
    const fadedFor = fadeReason(r, profile);
    return {
      id: r.id,
      name: r.nameEn,
      latitude: r.lat,
      longitude: r.lng,
      foodType: r.foodType,
      badges,
      badgeCount: badges.length,
      faded: fadedFor !== null,
      fadedFor,
      fromKakao: r.source === 'kakao',
    };
  });
}
