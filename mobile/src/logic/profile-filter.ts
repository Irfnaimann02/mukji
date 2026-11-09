import type { Diet, Dish, DishStatus, FoodProfile, Ingredient, Restaurant } from '@/data/types';

const BLOCKED_BY_DIET: Record<Diet, Ingredient[]> = {
  halal: ['pork', 'alcohol'],
  no_pork: ['pork'],
  vegan: ['pork', 'beef', 'chicken', 'seafood', 'egg', 'dairy'],
};

export function blockedIngredients(profile: FoodProfile): Set<Ingredient> {
  const blocked = new Set<Ingredient>(profile.allergens);
  for (const diet of profile.diets) BLOCKED_BY_DIET[diet].forEach((i) => blocked.add(i));
  return blocked;
}

export function dishStatus(dish: Dish, restaurant: Restaurant, profile: FoodProfile): DishStatus {
  const blocked = blockedIngredients(profile);
  if (dish.contains.some((i) => blocked.has(i))) return 'avoid';
  if (dish.mayContain.some((i) => blocked.has(i))) return 'ask_first';
  const hasMeat = [...dish.contains, ...dish.mayContain].some((i) => i === 'beef' || i === 'chicken');
  if (profile.diets.includes('halal') && hasMeat && !restaurant.halalCertified) return 'ask_first';
  return 'safe';
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
