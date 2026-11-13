export type Diet = 'halal' | 'vegan' | 'no_pork';

// What can be in a dish. Diets and allergies both check against this list.
export type Ingredient =
  | 'pork' | 'beef' | 'chicken' | 'seafood' | 'egg' | 'dairy'
  | 'alcohol' | 'peanut' | 'wheat' | 'soy';

export type Allergen = Extract<
  Ingredient,
  'peanut' | 'seafood' | 'egg' | 'dairy' | 'wheat' | 'soy'
>;

export type FoodType =
  | 'korean' | 'chicken' | 'noodles' | 'cafe' | 'halal' | 'other';

// Worked out by the filter for each person. Never stored.
export type DishStatus = 'safe' | 'ask_first' | 'avoid';

export interface Dish {
  id: string;
  nameKo: string;
  nameEn: string;
  priceWon: number;
  contains: Ingredient[]; // known to be in it
  mayContain: Ingredient[]; // unclear, e.g. the broth: makes it "ask first"
  leaveOutKo?: string; // e.g. '햄 빼 주세요'
  leaveOutEn?: string;
  verifiedCount: number; // #8
  lastChecked: string | null; // '2026-10-20', or null = not verified
}

// #47 Layer 2: what a type of restaurant usually uses, shown when it has no menu yet.
// Never makes anything Safe: the app always shows it as Ask first.
export interface CategoryHint {
  category: string; // licence data 업태구분명, e.g. '중국식'
  nameEn: string; // e.g. 'Chinese-Korean'
  contains: Ingredient[]; // usually in this type of food
  mayContain: Ingredient[]; // often in it
  noteKo: string;
  noteEn: string;
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
  recommendCount: number; // #7
  rating: number; // 0 to 5, #7
  sources: string[]; // #8, e.g. ['menu', '원산지 label', 'reviews']
  category?: string; // #47 licence data 업태구분명, e.g. '중국식'
  categoryHint?: CategoryHint; // #47 shown when there are no dishes yet
  dishes: Dish[];
  // #47: undefined or 'mukji' = our own checked data.
  // 'kakao' = found live with the Kakao Local API, no menu, not stored.
  source?: 'mukji' | 'kakao';
  kakaoPlaceId?: string;
  kakaoUrl?: string;
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