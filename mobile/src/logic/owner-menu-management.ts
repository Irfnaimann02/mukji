import { ALL_INGREDIENTS, type Dish, type Ingredient } from '@/data/types';

export type OwnerMenuCategory = 'main' | 'side' | 'drink' | 'other';

export interface OwnerMenuItemDraft {
  id?: string;
  nameKo: string;
  nameEn: string;
  priceWon: string;
  category: OwnerMenuCategory;
  isAvailable: boolean;
  contains: string;
  mayContain: string;
  leaveOutKo: string;
  leaveOutEn: string;
  ingredientsVerified: boolean;
  editable: boolean;
  photoUrl?: string;
}

export interface OwnerMenuValidation {
  nameKo: string;
  nameEn: string;
  priceWon: number;
  category: OwnerMenuCategory;
  contains: Ingredient[];
  mayContain: Ingredient[];
  leaveOutKo: string;
  leaveOutEn: string;
}

export type OwnerMenuValidationError =
  | 'name_ko_required'
  | 'name_en_invalid'
  | 'price_invalid'
  | 'category_invalid'
  | 'ingredient_unknown'
  | 'ingredient_overlap'
  | 'ingredient_required'
  | 'ordering_condition_invalid';

export function parseOwnerIngredients(value: string): {
  ingredients: Ingredient[];
  unknown: string[];
} {
  const words = value
    .split(/[\s,，、]+/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
  const ingredients = [...new Set(words.filter((word): word is Ingredient =>
    (ALL_INGREDIENTS as readonly string[]).includes(word),
  ))];
  const unknown = words.filter((word) => !(ALL_INGREDIENTS as readonly string[]).includes(word));
  return { ingredients, unknown };
}

export function validateOwnerMenuItem(input: {
  nameKo: string;
  nameEn: string;
  priceWon: string;
  category: string;
  contains: string;
  mayContain: string;
  leaveOutKo?: string;
  leaveOutEn?: string;
  requireIngredients?: boolean;
}): { ok: true; value: OwnerMenuValidation } | { ok: false; error: OwnerMenuValidationError } {
  const nameKo = input.nameKo.trim();
  if (!nameKo || nameKo.length > 120) return { ok: false, error: 'name_ko_required' };
  if (input.nameEn.trim().length > 120) return { ok: false, error: 'name_en_invalid' };

  const priceText = input.priceWon.trim().replace(/,/g, '');
  if (!/^\d{1,8}$/.test(priceText)) return { ok: false, error: 'price_invalid' };
  const priceWon = Number(priceText);
  if (!Number.isSafeInteger(priceWon) || priceWon < 0 || priceWon > 10_000_000) {
    return { ok: false, error: 'price_invalid' };
  }

  const categories: OwnerMenuCategory[] = ['main', 'side', 'drink', 'other'];
  if (!categories.includes(input.category as OwnerMenuCategory)) {
    return { ok: false, error: 'category_invalid' };
  }
  if ((input.leaveOutKo?.length ?? 0) > 300 || (input.leaveOutEn?.length ?? 0) > 300) {
    return { ok: false, error: 'ordering_condition_invalid' };
  }

  const contains = parseOwnerIngredients(input.contains);
  const mayContain = parseOwnerIngredients(input.mayContain);
  if (contains.unknown.length > 0 || mayContain.unknown.length > 0) {
    return { ok: false, error: 'ingredient_unknown' };
  }
  if (contains.ingredients.some((item) => mayContain.ingredients.includes(item))) {
    return { ok: false, error: 'ingredient_overlap' };
  }
  if (input.requireIngredients && contains.ingredients.length + mayContain.ingredients.length === 0) {
    return { ok: false, error: 'ingredient_required' };
  }

  return {
    ok: true,
    value: {
      nameKo,
      nameEn: input.nameEn.trim() || nameKo,
      priceWon,
      category: input.category as OwnerMenuCategory,
      contains: contains.ingredients,
      mayContain: mayContain.ingredients,
      leaveOutKo: input.leaveOutKo?.trim() ?? '',
      leaveOutEn: input.leaveOutEn?.trim() ?? '',
    },
  };
}

export function ownerMenuItemFromDish(dish: Dish): OwnerMenuItemDraft {
  return {
    id: dish.id,
    nameKo: dish.nameKo,
    nameEn: dish.nameEn,
    priceWon: String(dish.priceWon),
    category: (dish.menuCategory ?? 'other') as OwnerMenuCategory,
    isAvailable: dish.isAvailable !== false,
    contains: dish.contains.join(', '),
    mayContain: dish.mayContain.join(', '),
    leaveOutKo: dish.leaveOutKo ?? '',
    leaveOutEn: dish.leaveOutEn ?? '',
    ingredientsVerified: dish.ingredientsVerified !== false,
    editable: dish.typical !== true && !dish.id.includes('-chain-'),
    photoUrl: dish.photoUrl,
  };
}

export function ownerMenuItemsFromDishes(dishes: Dish[]): OwnerMenuItemDraft[] {
  return dishes.map(ownerMenuItemFromDish);
}
