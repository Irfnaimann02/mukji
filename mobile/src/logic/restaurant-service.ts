import {
  fetchKakaoRestaurants,
  findKakaoRestaurant,
  KAKAO_ID_PREFIX,
} from '@/data/kakao-repository';
import { fetchRestaurants } from '@/data/restaurant-repository';
import type { Restaurant } from '@/data/types';

// Only our own restaurants (Favourites, Reserve and Search use this).
export function listRestaurants(): Promise<Restaurant[]> {
  return fetchRestaurants();
}

// #47: our own restaurants plus the places Kakao finds around a point.
// If Kakao fails (no internet, quota), our own restaurants still show.
export async function listRestaurantsNear(
  lat: number,
  lng: number,
  radius: number
): Promise<Restaurant[]> {
  const [own, kakao] = await Promise.all([
    fetchRestaurants(),
    fetchKakaoRestaurants(lat, lng, radius).catch((error) => {
      console.warn('Kakao search failed:', error);
      return [] as Restaurant[];
    }),
  ]);

  const extra = kakao.filter((place) => !own.some((r) => samePlace(r, place)));
  return [...own, ...extra];
}

export async function findRestaurant(id: string): Promise<Restaurant | undefined> {
  if (id.startsWith(KAKAO_ID_PREFIX)) return findKakaoRestaurant(id);
  const all = await fetchRestaurants();
  return all.find((r) => r.id === id);
}

// The same restaurant if Kakao's id matches, or it is within about 30 m
// and the names start the same (e.g. 한솥(한대점) and 한솥도시락 안산한양대점).
function samePlace(own: Restaurant, place: Restaurant): boolean {
  if (own.kakaoPlaceId && own.kakaoPlaceId === place.kakaoPlaceId) return true;
  const close =
    Math.abs(own.lat - place.lat) < 0.0003 && Math.abs(own.lng - place.lng) < 0.0004;
  return close && own.nameKo.slice(0, 2) === place.nameKo.slice(0, 2);
}