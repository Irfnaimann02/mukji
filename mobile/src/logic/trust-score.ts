import type { Dish, Restaurant } from '@/data/types';

export type Confidence = 'high' | 'medium' | 'low';

// A check older than this no longer counts as fresh.
const FRESH_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DishTrust = {
  confidence: Confidence;
  verifiedCount: number;
  daysSinceCheck: number | null; // null = nobody has checked it
};

export type RestaurantTrust = {
  confidence: Confidence;
  verifiedDishes: number;
  totalDishes: number;
  sources: string[];
};

export function daysSince(date: string, today: Date): number {
  return Math.floor((today.getTime() - new Date(date).getTime()) / DAY_MS);
}

// #8: how sure we are about a dish's ingredients.
// Low = nobody checked it. High = 3+ people, checked in the last 90 days,
// nothing marked "may contain". Everything else = medium.
export function dishTrust(dish: Dish, today: Date = new Date()): DishTrust {
  const daysSinceCheck = dish.lastChecked
    ? daysSince(dish.lastChecked, today)
    : null;
  const fresh = daysSinceCheck !== null && daysSinceCheck <= FRESH_DAYS;

  let confidence: Confidence = 'medium';
  if (dish.verifiedCount === 0) {
    confidence = 'low';
  } else if (dish.verifiedCount >= 3 && fresh && dish.mayContain.length === 0) {
    confidence = 'high';
  }

  return { confidence, verifiedCount: dish.verifiedCount, daysSinceCheck };
}

// The whole restaurant: how many dishes are checked, and from how many sources.
export function restaurantTrust(
  restaurant: Restaurant,
  today: Date = new Date()
): RestaurantTrust {
  const levels = restaurant.dishes.map((dish) => dishTrust(dish, today).confidence);
  const verifiedDishes = levels.filter((level) => level !== 'low').length;
  const totalDishes = levels.length;
  const share = totalDishes === 0 ? 0 : verifiedDishes / totalDishes;

  let confidence: Confidence = 'low';
  if (share >= 0.7 && restaurant.sources.length >= 2) {
    confidence = 'high';
  } else if (share > 0 || restaurant.sources.length >= 2) {
    confidence = 'medium';
  }

  return { confidence, verifiedDishes, totalDishes, sources: restaurant.sources };
}