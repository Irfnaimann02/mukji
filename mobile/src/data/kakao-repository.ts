import { ensureSignedIn } from './auth';
import { supabase } from './supabase';
import type { FoodType, Restaurant } from './types';

type KakaoPlace = {
  id: string;
  name: string;
  category: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  meters: number;
  url: string;
};

export const KAKAO_ID_PREFIX = 'kakao-';

// Places from the latest searches, so the restaurant page can open them by id.
// Memory only: Kakao's terms do not allow storing place details.
const seen = new Map<string, Restaurant>();

// #47: restaurants Kakao knows around a point, anywhere in Korea.
export async function fetchKakaoRestaurants(
  lat: number,
  lng: number,
  radius: number
): Promise<Restaurant[]> {
  if (!supabase) return []; // no mobile/.env: mock data only
  await ensureSignedIn(); // the Edge Function only answers signed-in users (guests count)

  const { data, error } = await supabase.functions.invoke<{ places: KakaoPlace[] }>(
    'kakao-places',
    { body: { lat, lng, radius } }
  );
  if (error) throw error;

  const restaurants = (data?.places ?? []).map(toRestaurant);
  restaurants.forEach((r) => seen.set(r.id, r));
  return restaurants;
}

export function findKakaoRestaurant(id: string): Restaurant | undefined {
  return seen.get(id);
}

// Kakao categories look like "음식점 > 한식 > 육류,고기".
export function foodTypeFromCategory(category: string): FoodType {
  if (category.includes('치킨')) return 'chicken';
  if (/국수|냉면|라면|우동|라멘|짬뽕/.test(category)) return 'noodles';
  if (/카페|디저트|제과|베이커리/.test(category)) return 'cafe';
  if (category.includes('할랄')) return 'halal';
  if (category.includes('한식') || category.includes('분식')) return 'korean';
  return 'other';
}

function toRestaurant(place: KakaoPlace): Restaurant {
  return {
    id: `${KAKAO_ID_PREFIX}${place.id}`,
    nameKo: place.name,
    nameEn: place.name, // Kakao only has the Korean name
    foodType: foodTypeFromCategory(place.category),
    lat: place.lat,
    lng: place.lng,
    address: place.address,
    phone: place.phone,
    priceLevel: 2, // unknown, so the middle
    halalCertified: false,
    origin: [],
    recommendCount: 0,
    rating: 0,
    sources: ['kakao'],
    dishes: [],
    source: 'kakao',
    kakaoPlaceId: place.id,
    kakaoUrl: place.url,
  };
}