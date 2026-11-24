import type { Diet, Dish, DishStatus, FoodProfile, Ingredient, Restaurant } from '@/data/types';

export const BLOCKED_BY_DIET: Record<Diet, Ingredient[]> = {
  halal: ['pork', 'alcohol'],
  no_pork: ['pork'],
  vegan: ['pork', 'beef', 'chicken', 'lamb', 'seafood', 'egg', 'dairy'],
};

export const HALAL_MEAT: Ingredient[] = ['beef', 'chicken', 'lamb'];

export function blockedIngredients(profile: FoodProfile): Set<Ingredient> {
  const blocked = new Set<Ingredient>(profile.allergens);
  for (const diet of profile.diets) BLOCKED_BY_DIET[diet].forEach((i) => blocked.add(i));
  return blocked;
}

export function dishStatus(dish: Dish, restaurant: Restaurant, profile: FoodProfile): DishStatus {
  const blocked = blockedIngredients(profile);
  if (dish.contains.some((i) => blocked.has(i))) return 'avoid';
  if (dish.mayContain.some((i) => blocked.has(i))) return 'ask_first';
  // Meat that is fine for halal only when slaughtered the halal way.
  const hasMeat = [...dish.contains, ...dish.mayContain].some((i) => HALAL_MEAT.includes(i));
  if (profile.diets.includes('halal') && hasMeat && !restaurant.halalCertified) return 'ask_first';
  // #103: a typical menu is generated, not this restaurant's menu, so for anyone with a
  // diet or allergy it is never Safe. (With none, there is nothing to avoid.)
  if (dish.typical && (blocked.size > 0 || profile.diets.length > 0)) return 'ask_first';
  return 'safe';
}

// #103: true when everything shown comes from a generated typical menu.
export function isTypicalMenu(restaurant: Restaurant): boolean {
  return restaurant.dishes.length > 0 && restaurant.dishes.every((dish) => dish.typical === true);
}

export function restaurantFits(restaurant: Restaurant, profile: FoodProfile): boolean {
  return restaurant.dishes.some((d) => dishStatus(d, restaurant, profile) === 'safe');
}

// ---------- #14 Allergy filter ----------

// The user's allergens that are tagged on this dish, in `contains` or `mayContain`.
// Example: allergens [peanut, egg], 팟타이꿍 contains [seafood, egg], may contain [peanut, soy]
//   -> [egg, peanut]
export function allergensIn(dish: Dish, profile: FoodProfile): Ingredient[] {
  const allergens = profile.allergens as Ingredient[];
  const tagged = [...dish.contains, ...dish.mayContain];
  return allergens.filter((a) => tagged.includes(a));
}

export type MenuSplit = {
  shown: Dish[];
  hidden: Dish[];
  hiddenBecause: Ingredient[]; // which allergens caused the hiding, e.g. ['peanut']
};

// Every dish tagged with one of the user's allergens is hidden, even "may contain".
// The page has a "Show" link to bring them back (marked Avoid / Ask first).
export function splitMenu(restaurant: Restaurant, profile: FoodProfile): MenuSplit {
  const shown: Dish[] = [];
  const hidden: Dish[] = [];
  const because = new Set<Ingredient>();
  for (const dish of restaurant.dishes) {
    const found = allergensIn(dish, profile);
    if (found.length > 0) {
      hidden.push(dish);
      found.forEach((i) => because.add(i));
    } else {
      shown.push(dish);
    }
  }
  return { shown, hidden, hiddenBecause: [...because] };
}

// Fade the restaurant when the user has allergies and every dish gets hidden.
// No menu yet: we can't tell, so it is not faded (the page says "ask staff").
export function fadedForAllergies(restaurant: Restaurant, profile: FoodProfile): boolean {
  if (profile.allergens.length === 0) return false;
  if (restaurant.dishes.length === 0) return false;
  return splitMenu(restaurant, profile).shown.length === 0;
}

// ---------- #4 Map fade for diets ----------

export type FadeReason = 'allergy' | 'diet' | 'typical';

// Why a restaurant is faded on the map, or null when it is not.
// 'allergy': every dish is tagged with one of the user's allergens (#14, fadedForAllergies).
// 'diet': no dish here is Safe for the profile, e.g. halal at a place where every dish has
//   pork or meat that may not be halal. Same rule as Home ("Near you") and Search (restaurantFits),
//   so the map no longer shows a place as normal that the rest of the app says doesn't fit.
// 'typical' (#103): only a generated typical menu, which is never Safe for anyone with a diet or
//   allergy, so it is faded for allergy-only profiles too (Home already hides these places).
// No menu yet: we can't tell, so it is not faded (the page says "ask staff").
export function fadeReason(restaurant: Restaurant, profile: FoodProfile): FadeReason | null {
  if (restaurant.dishes.length === 0) return null;
  if (fadedForAllergies(restaurant, profile)) return 'allergy';
  const restricted = profile.diets.length > 0 || profile.allergens.length > 0;
  if (restricted && isTypicalMenu(restaurant)) return 'typical';
  if (profile.diets.length > 0 && !restaurantFits(restaurant, profile)) return 'diet';
  return null;
}
