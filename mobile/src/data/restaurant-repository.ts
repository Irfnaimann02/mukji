
import { MOCK_RESTAURANTS } from './mock-restaurants';
import { supabase } from './supabase';
import type { CategoryHint, Dish, Restaurant } from './types';

// The only file that knows where restaurants come from.
// Supabase only returns approved restaurants (row level security).
//
// #48: Mukji now holds every licensed restaurant in Ansan (thousands), so the app
// never downloads all of them. It asks for the ones near a point, by id, or by a
// search word. Supabase returns at most 1000 rows per request anyway.

const WITH_DISHES = '*, dishes(*)';
// Most restaurants one map view or list asks for; the nearest come first.
const NEARBY_MAX = 600;
const SEARCH_MAX = 50;
const IDS_PER_REQUEST = 100;

let hintsRequest: Promise<Map<string, CategoryHint>> | null = null;

// Food-type hints rarely change: load them once per app start.
// A missing hint never blocks the app: restaurants still load without it.
function categoryHints(): Promise<Map<string, CategoryHint>> {
  if (!supabase) return Promise.resolve(new Map());
  const client = supabase;
  hintsRequest ??= (async () => {
    const { data, error } = await client.from('category_defaults').select('*');
    if (error) {
      console.warn('Could not load food-type hints:', error.message);
      hintsRequest = null; // try again next time
      return new Map<string, CategoryHint>();
    }
    return new Map<string, CategoryHint>(
      (data ?? []).map((row) => [row.category, toCategoryHint(row)])
    );
  })();
  return hintsRequest;
}

async function toRestaurants(rows: any[] | null): Promise<Restaurant[]> {
  const hints = await categoryHints();
  return (rows ?? []).map((row) => toRestaurant(row, hints));
}

function warnMock(): void {
  console.warn('Supabase keys missing in mobile/.env, using mock restaurants.');
}

// Restaurants within radiusM of a point, nearest first (SQL 032: restaurants_near).
export async function fetchRestaurantsNear(
  lat: number,
  lng: number,
  radiusM: number
): Promise<Restaurant[]> {
  if (!supabase) {
    warnMock();
    return MOCK_RESTAURANTS;
  }
  const { data, error } = await supabase
    .rpc('restaurants_near', {
      p_lat: lat,
      p_lng: lng,
      p_radius_m: Math.round(radiusM),
      p_max: NEARBY_MAX,
    })
    .select(WITH_DISHES);
  if (error) throw error;
  return toRestaurants(data as any[]);
}

// The restaurants with these ids (favourites, bookings, one restaurant page).
export async function fetchRestaurantsByIds(ids: string[]): Promise<Restaurant[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return [];
  if (!supabase) {
    warnMock();
    return MOCK_RESTAURANTS.filter((r) => unique.includes(r.id));
  }
  const client = supabase;
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += IDS_PER_REQUEST) {
    chunks.push(unique.slice(i, i + IDS_PER_REQUEST));
  }
  const results = await Promise.all(
    chunks.map((chunk) => client.from('restaurants').select(WITH_DISHES).in('id', chunk))
  );
  const rows: any[] = [];
  for (const result of results) {
    if (result.error) throw result.error;
    rows.push(...(result.data ?? []));
  }
  return toRestaurants(rows);
}

// Restaurants whose name, food type or one of whose dishes contains the word.
// The word is reduced to letters, numbers and spaces first, so it cannot change
// the query itself.
export async function searchRestaurantRows(query: string): Promise<Restaurant[]> {
  const word = query.replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!word) return [];
  if (!supabase) {
    warnMock();
    return MOCK_RESTAURANTS;
  }
  const like = `%${word}%`;
  const [byName, byDish] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id')
      .or(`name_ko.ilike.${like},name_en.ilike.${like},food_type.ilike.${like}`)
      .limit(SEARCH_MAX),
    supabase
      .from('dishes')
      .select('restaurant_id')
      .or(`name_ko.ilike.${like},name_en.ilike.${like}`)
      .limit(SEARCH_MAX * 4),
  ]);
  if (byName.error) throw byName.error;
  if (byDish.error) throw byDish.error;
  const ids = [
    ...(byName.data ?? []).map((row) => String(row.id)),
    ...(byDish.data ?? []).map((row) => String(row.restaurant_id)),
  ];
  return fetchRestaurantsByIds([...new Set(ids)].slice(0, SEARCH_MAX));
}

// The restaurants the team added by hand (not the bulk licence import), for
// places that need a short list, like the owner portal's "choose your restaurant".
export async function fetchListedRestaurants(): Promise<Restaurant[]> {
  if (!supabase) {
    warnMock();
    return MOCK_RESTAURANTS;
  }
  const { data, error } = await supabase
    .from('restaurants')
    .select(WITH_DISHES)
    .eq('bulk_import', false)
    .order('name_ko')
    .limit(NEARBY_MAX);
  if (error) throw error;
  return toRestaurants(data as any[]);
}

// Database columns are snake_case; the app uses camelCase.
function toRestaurant(
  row: any,
  hintByCategory: Map<string, CategoryHint>
): Restaurant {
  const dishes = (row.dishes ?? []).map(toDish) as Dish[];

  const highestPricedDish = dishes.reduce<Dish | undefined>(
    (highest, dish) =>
      !highest || dish.priceWon > highest.priceWon ? dish : highest,
    undefined,
  );

  const savedFeaturedName = String(row.featured_dish_name_en ?? '').trim();
  const featuredDishNameEn =
    highestPricedDish?.nameEn?.trim() || savedFeaturedName || undefined;
  const savedFeaturedImageUrl = String(
    row.featured_dish_image_url ?? '',
  ).trim();
  const savedImageMatchesFeaturedDish =
    Boolean(savedFeaturedName && featuredDishNameEn) &&
    savedFeaturedName.toLocaleLowerCase() ===
      featuredDishNameEn?.toLocaleLowerCase();

  return {
    id: row.id,
    nameKo: row.name_ko,
    nameEn: row.name_en,
    foodType: row.food_type,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    phone: row.phone,

    // The most expensive listed dish represents the restaurant.
    // Reuse a saved image only when its saved dish label matches that dish.
    featuredDishNameEn,
    featuredDishImageUrl:
      savedImageMatchesFeaturedDish && savedFeaturedImageUrl
        ? savedFeaturedImageUrl
        : undefined,

    // Older database rows may not have a booking URL.
    reservationUrl: row.reservation_url ?? undefined,

    priceLevel: row.price_level,
    halalCertified: row.halal_certified,
    origin: row.origin ?? [],
    recommendCount: row.recommend_count,
    rating: row.rating,
    sources: row.sources ?? [],

    // Food category and its corresponding suitability hint.
    category: row.category ?? undefined,
    categoryHint: row.category
      ? hintByCategory.get(row.category)
      : undefined,

    dishes,
    source: 'mukji',
    kakaoPlaceId: row.kakao_place_id ?? undefined,
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
    typical: row.typical === true, // #103
    ingredientsVerified: row.ingredients_verified !== false,
    menuCategory: row.menu_category ?? 'other',
    isAvailable: row.is_available !== false,
    photoUrl: row.photo_path && supabase
      ? supabase.storage.from('menu-item-photos').getPublicUrl(String(row.photo_path)).data.publicUrl
      : undefined,
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
