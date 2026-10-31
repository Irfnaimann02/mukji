import { MOCK_RESTAURANTS } from './mock-restaurants';
import type { Restaurant } from './types';

export async function fetchRestaurants(): Promise<Restaurant[]> {
  return MOCK_RESTAURANTS;
}