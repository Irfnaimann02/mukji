import type { Dish, DishStatus, FoodProfile, Restaurant } from './types';
import { relevantOrigin } from '@/logic/dish-explanation';
import { ensureSignedIn } from './auth';
import { supabase } from './supabase';

// #10 Asks the Edge Function explain-dish for a plain-language "Why?".
// Returns null when AI is not set up or fails: the app then shows the data-based reasons only.

const cache = new Map<string, string>();

export async function fetchAiReason(
  dish: Dish,
  restaurant: Restaurant,
  profile: FoodProfile,
  status: DishStatus,
): Promise<string | null> {
  if (!supabase) return null; // no mobile/.env

  const key = [
    restaurant.id,
    dish.id,
    status,
    profile.language,
    [...profile.diets].sort().join('.'),
    [...profile.allergens].sort().join('.'),
  ].join('|');
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    await ensureSignedIn(); // Edge Functions only answer signed-in users (guests count)
    const { data, error } = await supabase.functions.invoke<{ reason?: string }>('explain-dish', {
      body: {
        language: profile.language,
        status,
        dish: {
          nameKo: dish.nameKo,
          nameEn: dish.nameEn,
          contains: dish.contains,
          mayContain: dish.mayContain,
        },
        restaurant: {
          nameKo: restaurant.nameKo,
          nameEn: restaurant.nameEn,
          halalCertified: restaurant.halalCertified,
          origin: relevantOrigin(dish, restaurant.origin).map((o) => `${o.itemKo}: ${o.country}`),
          sources: restaurant.sources,
        },
        profile: { diets: profile.diets, allergens: profile.allergens },
      },
    });
    if (error || !data?.reason) return null;
    cache.set(key, data.reason);
    return data.reason;
  } catch {
    return null;
  }
}
