export type Diet = 'halal' | 'vegan' | 'no_pork';

// What can be in a dish. Diets and allergies both check against this list.
export type Ingredient =
  | 'pork' | 'beef' | 'chicken' | 'seafood' | 'egg' | 'dairy'
  | 'alcohol' | 'peanut' | 'wheat' | 'soy';

export type Allergen = Extract<Ingredient, 'peanut' | 'seafood' | 'egg' | 'dairy' | 'wheat' | 'soy'>;

export type FoodType = 'korean' | 'chicken' | 'noodles' | 'cafe' | 'halal' | 'other';

// Worked out by the filter for each person. Never stored.
export type DishStatus = 'safe' | 'ask_first' | 'avoid';

export interface Dish {
  id: string;
  nameKo: string;
  nameEn: string;
  priceWon: number;
  contains: Ingredient[];     // known to be in it
  mayContain: Ingredient[];   // unclear, e.g. the broth: makes it "ask first"
  leaveOutKo?: string;        // e.g. '햄 빼 주세요'
  leaveOutEn?: string;
  verifiedCount: number;      // #8
  lastChecked: string | null; // '2026-10-20', or null = not verified
}

export interface OriginLabel {
  itemKo: string;  // 원산지 item, e.g. '닭고기'
  country: string;
}

export interface Restaurant {
  id: string;
  nameKo: string;
  nameEn: string;
  foodType: FoodType;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  priceLevel: 1 | 2 | 3;
  halalCertified: boolean;
  origin: OriginLabel[];
  recommendCount: number; // #7
  rating: number;         // 0 to 5, #7
  sources: string[];      // #8, e.g. ['menu', '원산지 label', 'reviews']
  dishes: Dish[];
}

export interface FoodProfile {
  diets: Diet[];
  allergens: Allergen[];
  maxDistanceM: number;
  language: 'ko' | 'en';
}

export const DEFAULT_PROFILE: FoodProfile = {
  diets: [],
  allergens: [],
  maxDistanceM: 1500,
  language: 'en',
};