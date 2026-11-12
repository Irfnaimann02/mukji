import type { FoodProfile, FoodType, Restaurant } from '@/data/types';
import { restaurantFits } from '@/logic/profile-filter';
import { listRestaurantsNear } from '@/logic/restaurant-service';
import { rankSuggestions } from '@/logic/suggestion-ranker';

export type Point = { lat: number; lng: number };

// Middle of campus. Used when we don't have the user's location.
export const ERICA_CENTRE: Point = { lat: 37.2967, lng: 126.836 };

const WALK_METERS_PER_MINUTE = 80;

export type NearbyRestaurant = {
  restaurant: Restaurant;
  meters: number;
};

// Straight-line distance in metres (haversine formula).
export function distanceInMeters(a: Point, b: Point): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_METERS_PER_MINUTE));
}

// Restaurants within the profile's distance that fit the profile,
// optionally only one food type, best suggestion first.
export async function nearbyRestaurants(
  profile: FoodProfile,
  foodType: FoodType | null,
  from: Point = ERICA_CENTRE,
): Promise<NearbyRestaurant[]> {
  const all = await listRestaurantsNear(from.lat, from.lng, profile.maxDistanceM);
  // Kakao places have no menu, so we can't promise they fit a diet or allergy.
  // Show them in the list only to people with no restrictions.
  const noRestrictions = profile.diets.length === 0 && profile.allergens.length === 0;
  const fitting = all
    .map((restaurant) => ({ restaurant, meters: distanceInMeters(from, restaurant) }))
    .filter(
      ({ restaurant, meters }) =>
        meters <= profile.maxDistanceM &&
        (restaurant.source === 'kakao' ? noRestrictions : restaurantFits(restaurant, profile)) &&
        (foodType === null || restaurant.foodType === foodType),
    );
  return rankSuggestions(fitting, profile.maxDistanceM);
}