export type Diet = 'halal' | 'vegan' | 'no_pork';

export type Ingredient =
  | 'pork' | 'beef' | 'chicken' | 'seafood' | 'egg' | 'dairy'
  | 'alcohol' | 'peanut' | 'wheat' | 'soy';

export type Allergen = Extract<
  Ingredient,
  'peanut' | 'seafood' | 'egg' | 'dairy' | 'wheat' | 'soy'
>;

export type FoodType =
  | 'korean' | 'chicken' | 'noodles' | 'cafe' | 'halal' | 'other';

export type DishStatus = 'safe' | 'ask_first' | 'avoid';

export interface Dish {
  id: string;
  nameKo: string;
  nameEn: string;
  priceWon: number;
  contains: Ingredient[];
  mayContain: Ingredient[];
  leaveOutKo?: string;
  leaveOutEn?: string;
  verifiedCount: number;
  lastChecked: string | null;
}

export interface OriginLabel {
  itemKo: string;
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

  // Optional external online reservation page.
  // If absent, Mukji offers phone contact instead.
  reservationUrl?: string;

  priceLevel: 1 | 2 | 3;
  halalCertified: boolean;
  origin: OriginLabel[];
  recommendCount: number;
  rating: number;
  sources: string[];
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