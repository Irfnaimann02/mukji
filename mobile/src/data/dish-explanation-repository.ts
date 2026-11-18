import type { Dish, DishStatus, FoodProfile, Restaurant } from './types';
import { relevantOrigin } from '@/logic/dish-explanation';
import type { OrderPhrase } from '@/logic/order-phrases';
import { ensureSignedIn } from './auth';
import { supabase } from './supabase';

// #10 Asks the Edge Function explain-dish why a dish is unsure for this user,
// and for Korean questions that fit this exact dish.
// Returns null when AI is not set up or fails: the app then shows the data-based reasons only.

export interface AiExplanation {
  reason: string;
  questions: OrderPhrase[]; // can be empty: the app then keeps its own questions
}

const cache = new Map<string, AiExplanation>();

export async function fetchAiExplanation(
  dish: Dish,
  restaurant: Restaurant,
  profile: FoodProfile,
  status: DishStatus,
): Promise<AiExplanation | null> {
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
    const { data, error } = await supabase.functions.invoke<{
      reason?: string;
      questions?: { ko?: string; rom?: string; en?: string }[];
    }>('explain-dish', {
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
          category: restaurant.category ?? '',
          foodType: restaurant.foodType,
          halalCertified: restaurant.halalCertified,
          origin: relevantOrigin(dish, restaurant.origin).map((o) => `${o.itemKo}: ${o.country}`),
          sources: restaurant.sources,
        },
        profile: { diets: profile.diets, allergens: profile.allergens },
      },
    });
    if (error || !data?.reason) return null;
    const answer: AiExplanation = {
      reason: data.reason,
      questions: (data.questions ?? [])
        .filter((q) => typeof q.ko === 'string' && q.ko.trim() !== '')
        .map((q) => ({ ko: q.ko!.trim(), rom: q.rom?.trim() || undefined, en: q.en?.trim() ?? '' })),
    };
    cache.set(key, answer);
    return answer;
  } catch {
    return null;
  }
}
