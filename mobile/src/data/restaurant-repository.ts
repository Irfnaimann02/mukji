import { MOCK_RESTAURANTS } from './mock-restaurants';
import { supabase } from './supabase';
import type { Dish, Restaurant } from './types';

// The only file that knows where restaurants come from.
// Supabase only returns approved restaurants (row level security).
export async function fetchRestaurants(): Promise<Restaurant[]> {
  if (!supabase) {
    console.warn('Supabase keys missing in mobile/.env, using mock restaurants.');
    return MOCK_RESTAURANTS;
  }
  const { data, error } = await supabase.from('restaurants').select('*, dishes(*)');
  if (error) throw error;
  return data.map(toRestaurant);
}

// Database columns are snake_case; the app uses camelCase.
function toRestaurant(row: any): Restaurant {
  return {
    id: row.id,
    nameKo: row.name_ko,
    nameEn: row.name_en,
    foodType: row.food_type,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    phone: row.phone,
    priceLevel: row.price_level,
    halalCertified: row.halal_certified,
    origin: row.origin ?? [],
    recommendCount: row.recommend_count,
    rating: row.rating,
    sources: row.sources ?? [],
    dishes: (row.dishes ?? []).map(toDish),
  };
}

function toDish(row: any): Dish {
  return {
    id: row.id,
    nameKo: row.name_ko,
    nameEn: row.name_en,
    priceWon: row.price_won,
    contains: row.contains ?? [],
    mayContain: row.may_contain ?? [],
    leaveOutKo: row.leave_out_ko ?? undefined,
    leaveOutEn: row.leave_out_en ?? undefined,
    verifiedCount: row.verified_count,
    lastChecked: row.last_checked,
  };
}