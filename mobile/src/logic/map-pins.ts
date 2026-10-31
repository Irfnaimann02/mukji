import { getAllRestaurants } from '@/data/restaurant-repository';
import { FoodType } from '@/data/restaurants';

export type MapPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  foodType: FoodType;
  badgeCount: number;
};

export function getMapPins(): MapPin[] {
  return getAllRestaurants().map((restaurant) => ({
    id: restaurant.id,
    name: restaurant.name,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    foodType: restaurant.foodType,
    badgeCount: restaurant.badges.length,
  }));
}