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
