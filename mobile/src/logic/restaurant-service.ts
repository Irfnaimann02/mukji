import { fetchRestaurants } from '@/data/restaurant-repository';
import type { Restaurant } from '@/data/types';

export function listRestaurants(): Promise<Restaurant[]> {
  return fetchRestaurants();
}

export async function findRestaurant(id: string): Promise<Restaurant | undefined> {
  const all = await fetchRestaurants();
  return all.find((r) => r.id === id);
}