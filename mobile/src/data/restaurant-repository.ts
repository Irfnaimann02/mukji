
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

  // Load restaurants and food-type hints together.
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
  const dishes = (row.dishes ?? []).map(toDish) as Dish[];

  const highestPricedDish = dishes.reduce<Dish | undefined>(
    (highest, dish) =>
      !highest || dish.priceWon > highest.priceWon ? dish : highest,
    undefined,
  );

  const savedFeaturedName = String(row.featured_dish_name_en ?? '').trim();

  const savedImageMatchesHighest =
    !highestPricedDish ||
    savedFeaturedName.toLowerCase() ===
      highestPricedDish.nameEn.trim().toLowerCase();

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
    // A saved featured image is reused only when its saved dish label matches it.
    featuredDishNameEn: highestPricedDish?.nameEn ?? savedFeaturedName ?? undefined,
    featuredDishImageUrl:
      (savedImageMatchesHighest ? row.featured_dish_image_url : undefined) ??
      imageForDish(
        highestPricedDish?.nameEn ?? savedFeaturedName ?? row.name_en,
        row.id
      ),

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

function imageForDish(label: string, restaurantId: string): string {
  const value = label.toLowerCase();

  const photoSets: [RegExp, string[]][] = [
    [/kimbap|김밥|sushi/, [
      'photo-1579871494447-9811cf80d66c',
      'photo-1579584425555-c3ce17fd4351',
      'photo-1553621042-f6e147245754',
      'photo-1563612116625-3012372fccce',
    ]],
    [/chicken|치킨|닭/, [
      'photo-1626082927389-6cd097cdc6ec',
      'photo-1562967914-608f82629710',
      'photo-1626645738196-c2a7c87a8f58',
      'photo-1555939594-58d7cb561ad1',
      'photo-1544025162-d76694265947',
    ]],
    [/kebab|케밥|shawarma/, [
      'photo-1529006557810-274b9b2fc783',
      'photo-1529042410759-befb1204b468',
      'photo-1561651823-34feb02250e4',
      'photo-1544025162-d76694265947',
    ]],
    [/burrito|부리또|taco/, [
      'photo-1565299624946-b28f40a0ae38',
      'photo-1551504734-5ee1c4a1479b',
      'photo-1562059390-a761a084768e',
      'photo-1513104890138-7c749659a591',
    ]],
    [/noodle|ramyeon|라면|국수|우동/, [
      'photo-1569718212165-3a8278d5f624',
      'photo-1569058242253-92a9c755a0ec',
      'photo-1569929232522-9c8a1c8f7a4f',
      'photo-1569718212165-3a8278d5f624',
    ]],
    [/burger|버거|sandwich|hot dog/, [
      'photo-1568901346375-23c9450c58cd',
      'photo-1553979459-d2229ba7433a',
      'photo-1561758033-d89a9ad46330',
    ]],
    [/pizza|피자/, [
      'photo-1513104890138-7c749659a591',
      'photo-1579751626657-72bc17010498',
      'photo-1571407970349-bc81e7e96d47',
    ]],
    [/bibimbap|비빔밥|bulgogi|불고기/, [
      'photo-1512058564366-18510be2db19',
      'photo-1547592180-85f173990554',
      'photo-1490645935967-10de6ba17061',
    ]],
    [/dumpling|만두|mandu/, [
      'photo-1563245372-f21724e3856d',
      'photo-1564834744159-ff0e2f96d0e5',
      'photo-1562802378-063ec186a863',
    ]],
    [/curry|카레|카레라이스/, [
      'photo-1603894584373-5ac82b2ae398',
      'photo-1585937421612-70a008356fbe',
      'photo-1604908176997-125f25cc6f3d',
    ]],
    [/seafood|해물|생선|fish|shrimp|새우/, [
      'photo-1519708227418-c8fd9a32b7a2',
      'photo-1559737558-2f5a35f4523b',
      'photo-1510130387422-82bed34b37e9',
    ]],
    [/rice|밥|덮밥|볶음밥/, [
      'photo-1512058564366-18510be2db19',
      'photo-1516684732162-798a0062be99',
      'photo-1547592180-85f173990554',
    ]],
    [/salad|샐러드|vegan/, [
      'photo-1512621776951-a57141f2eefd',
      'photo-1540420773420-3366772f4999',
      'photo-1511690743698-d9d85f2fbf38',
      'photo-1547592180-85f173990554',
    ]],
  ];

  const matched = photoSets.find(([pattern]) => pattern.test(value));

  const options = matched?.[1] ?? [
    'photo-1546069901-ba9599a7e63c',
    'photo-1490645935967-10de6ba17061',
    'photo-1547592180-85f173990554',
  ];

  // Keep a consistent but different image per restaurant within each food group.
  const hash = [...String(restaurantId)].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );

  const photoId = options[hash % options.length];

  return `https://images.unsplash.com/${photoId}?w=900&auto=format&fit=crop&q=85`;
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
