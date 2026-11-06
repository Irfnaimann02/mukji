import {
    clearRecentSearches,
    loadRecentSearches,
    saveRecentSearch,
} from '@/data/search-history-store';
import type { Diet, FoodProfile, Restaurant } from '@/data/types';
import { restaurantFits } from '@/logic/profile-filter';
import { listRestaurants } from '@/logic/restaurant-service';

// Picked by the team for around ERICA until we have real search counts.
const POPULAR_FOR_EVERYONE = ['Kimbap', 'Chicken', 'Ramyeon', 'Cafe'];
const POPULAR_FOR_DIET: Record<Diet, string[]> = {
  halal: ['Halal', 'Kebab'],
  vegan: ['Vegetable', 'Salad'],
  no_pork: ['Chicken', 'Beef'],
};
const MAX_POPULAR = 6;

export type SearchResult = {
  restaurant: Restaurant;
  fits: boolean;
};

// Searches for the user's diets come first.
export function popularSearches(profile: FoodProfile): string[] {
  const forDiets = profile.diets.flatMap((diet) => POPULAR_FOR_DIET[diet]);
  return [...new Set([...forDiets, ...POPULAR_FOR_EVERYONE])].slice(0, MAX_POPULAR);
}

function matches(restaurant: Restaurant, query: string): boolean {
  const text = [
    restaurant.nameKo,
    restaurant.nameEn,
    restaurant.foodType,
    ...restaurant.dishes.flatMap((dish) => [dish.nameKo, dish.nameEn]),
  ]
    .join(' ')
    .toLowerCase();
  return text.includes(query);
}

// Matches restaurant names, dish names and food type, in Korean or English.
// Places that fit the profile come first; the rest are still shown, marked.
export async function searchRestaurants(
  query: string,
  profile: FoodProfile,
): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const all = await listRestaurants();
  return all
    .filter((restaurant) => matches(restaurant, q))
    .map((restaurant) => ({ restaurant, fits: restaurantFits(restaurant, profile) }))
    .sort((a, b) => Number(b.fits) - Number(a.fits));
}

export const recentSearches = loadRecentSearches;
export const rememberSearch = saveRecentSearch;
export const forgetSearches = clearRecentSearches;