import type { Restaurant } from '@/data/types';

// How much each part counts. Reviews matter most, then recommendations,
// then how close it is.
const PRICE_WEIGHT = 0.4;
const DISTANCE_WEIGHT = 0.25;
const RECOMMEND_WEIGHT = 0.2;
const RATING_WEIGHT = 0.15;

const RECOMMEND_CAP = 50;

export type Ranked = {
  restaurant: Restaurant;
  meters: number;
};

// A number from 0 to 1. Higher means it shows first.
export function suggestionScore(item: Ranked, maxDistanceM: number): number {
  const cheapness = (3 - item.restaurant.priceLevel) / 2; // 1 = cheapest, 0 = priciest
  const nearness = 1 - Math.min(item.meters / maxDistanceM, 1);
  const recommends = Math.min(item.restaurant.recommendCount, RECOMMEND_CAP) / RECOMMEND_CAP;
  const rating = item.restaurant.rating / 5;
  return (
    cheapness * PRICE_WEIGHT +
    nearness * DISTANCE_WEIGHT +
    recommends * RECOMMEND_WEIGHT +
    rating * RATING_WEIGHT
  );
}

// Best first. If two places score the same, the nearer one wins.
export function rankSuggestions<T extends Ranked>(items: T[], maxDistanceM: number): T[] {
  return [...items].sort(
    (a, b) =>
      suggestionScore(b, maxDistanceM) - suggestionScore(a, maxDistanceM) || a.meters - b.meters,
  );
}