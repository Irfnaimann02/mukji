import { MOCK_RESTAURANTS } from './mock-restaurants';
import { supabase } from './supabase';
import type { CategoryHint, Dish, Restaurant } from './types';

// The only file that knows where restaurants come from.
// Supabase only returns approved restaurants (row level security).
export async function fetchRestaurants(): Promise<Restaurant[]> {
  if (!supabase) {
    console.warn(
      'Supabase keys missing in mobile/.env, using mock restaurants.'
    );
    return MOCK_RESTAURANTS;
  }

  // #47: food-type hints are a small table (one row per type), loaded next to the restaurants.
  const [restaurants, hints] = await Promise.all([
    supabase.from('restaurants').select('*, dishes(*)'),
    supabase.from('category_defaults').select('*'),
  ]);

  if (restaurants.error) throw restaurants.error;

  // A missing hint never blocks the app: restaurants still load without it.
  if (hints.error) {
    console.warn('Could not load food-type hints:', hints.error.message);
  }

  const hintByCategory = new Map<string, CategoryHint>(
    (hints.data ?? []).map((row) => [row.category, toCategoryHint(row)])
  );

  return restaurants.data.map((row) => toRestaurant(row, hintByCategory));
}

// Database columns are snake_case; the app uses camelCase.
function toRestaurant(
  row: any,
  hintByCategory: Map<string, CategoryHint>
): Restaurant {
  return {
    id: row.id,
    nameKo: row.name_ko,
    nameEn: row.name_en,
    foodType: row.food_type,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    phone: row.phone,

    // Older database rows may not have a booking URL.
    reservationUrl: row.reservation_url ?? undefined,

    priceLevel: row.price_level,
    halalCertified: row.halal_certified,
    origin: row.origin ?? [],
    recommendCount: row.recommend_count,
    rating: row.rating,
    sources: row.sources ?? [],
    category: row.category ?? undefined,
    categoryHint: row.category ? hintByCategory.get(row.category) : undefined,
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

function toCategoryHint(row: any): CategoryHint {
  return {
    category: row.category,
    nameEn: row.name_en,
    contains: row.contains ?? [],
    mayContain: row.may_contain ?? [],
    noteKo: row.note_ko ?? '',
    noteEn: row.note_en ?? '',
  };
}
