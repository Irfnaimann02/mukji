import {
  fetchKakaoRestaurants,
  findKakaoRestaurant,
  KAKAO_ID_PREFIX,
} from '@/data/kakao-repository';
import {
  fetchListedRestaurants,
  fetchRestaurantsByIds,
  fetchRestaurantsNear,
  searchRestaurantRows,
} from '@/data/restaurant-repository';
import type { Restaurant } from '@/data/types';
import { withinRadius } from '@/logic/geo';

// #48: the app never loads every restaurant at once (there are thousands in Ansan).

// Our own restaurants with these ids, e.g. the user's favourites or bookings.
export function listRestaurantsByIds(ids: string[]): Promise<Restaurant[]> {
  return fetchRestaurantsByIds(ids);
}

// Our own restaurants whose name, food type or a dish matches the word.
export function findRestaurantsMatching(query: string): Promise<Restaurant[]> {
  return searchRestaurantRows(query);
}

// The short list the team added by hand (owner portal: choose your restaurant).
export function listListedRestaurants(): Promise<Restaurant[]> {
  return fetchListedRestaurants();
}

// #47: our own restaurants plus the places Kakao finds around a point.
// If Kakao fails (no internet, quota), our own restaurants still show.
export async function listRestaurantsNear(
  lat: number,
  lng: number,
  radius: number
): Promise<Restaurant[]> {
  const [own, kakao] = await Promise.all([
    fetchRestaurantsNear(lat, lng, radius),
    fetchKakaoRestaurants(lat, lng, radius).catch((error) => {
      console.warn('Kakao search failed:', error);
      return [] as Restaurant[];
    }),
  ]);

  const extra = kakao.filter((place) => !own.some((r) => samePlace(r, place)));
  // The database already keeps to the radius (032); this keeps the map honest
  // even if a search area ever comes back as a square.
  return withinRadius([...own, ...extra], { lat, lng }, radius);
}

export async function findRestaurant(id: string): Promise<Restaurant | undefined> {
  if (id.startsWith(KAKAO_ID_PREFIX)) return findKakaoRestaurant(id);
  const [restaurant] = await fetchRestaurantsByIds([id]);
  return restaurant;
}

// The same restaurant if Kakao's id matches, or it is within about 30 m
// and the names start the same (e.g. 한솥(한대점) and 한솥도시락 안산한양대점).
function samePlace(own: Restaurant, place: Restaurant): boolean {
  if (own.kakaoPlaceId && own.kakaoPlaceId === place.kakaoPlaceId) return true;
  const close =
    Math.abs(own.lat - place.lat) < 0.0003 && Math.abs(own.lng - place.lng) < 0.0004;
  return close && own.nameKo.slice(0, 2) === place.nameKo.slice(0, 2);
}