import type { FoodType, Ingredient, Restaurant } from '@/data/types';
import { listRestaurants } from '@/logic/restaurant-service';

export type MapPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  foodType: FoodType;
  badges: string[];
  badgeCount: number;
};

const VEGAN_BLOCKED: Ingredient[] = ['pork', 'beef', 'chicken', 'seafood', 'egg', 'dairy'];

// "Who it fits" badges, worked out from what the restaurant serves.
// Adib's BadgeService (#8) can replace this later.
function badgesFor(r: Restaurant): string[] {
  const badges: string[] = [];
  const all = (d: Restaurant['dishes'][number]) => [...d.contains, ...d.mayContain];
  if (r.halalCertified) badges.push('halal');
  if (r.dishes.every((d) => !all(d).includes('pork'))) badges.push('no-pork');
  if (r.dishes.some((d) => !all(d).some((i) => VEGAN_BLOCKED.includes(i)))) {
    badges.push('vegan-option');
  }
  return badges;
}

export async function getMapPins(): Promise<MapPin[]> {
  const restaurants = await listRestaurants();
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
    };
  });
}