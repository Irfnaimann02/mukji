export type Diet = 'halal' | 'vegan' | 'no_pork';

// What can be in a dish. Diets and allergies both check against this list.
export type Ingredient =
  | 'pork' | 'beef' | 'chicken' | 'lamb' | 'seafood' | 'egg' | 'dairy'
  | 'alcohol' | 'peanut' | 'wheat' | 'soy';

// Every ingredient, in the order lists show them. Typed so a new ingredient
// added to the type above must be added here too.
const INGREDIENT_ORDER = {
  pork: 1, alcohol: 2, beef: 3, chicken: 4, lamb: 5, seafood: 6,
  egg: 7, dairy: 8, peanut: 9, wheat: 10, soy: 11,
} satisfies Record<Ingredient, number>;
export const ALL_INGREDIENTS = (Object.keys(INGREDIENT_ORDER) as Ingredient[]).sort(
  (a, b) => INGREDIENT_ORDER[a] - INGREDIENT_ORDER[b],
);

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
  // #103: generated "typical menu" dish (SQL 038), not this restaurant's real menu.
  // Never shown as Safe to anyone with a diet or allergy.
  typical?: boolean;
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
  // Optional representative image and dish label for restaurant discovery cards.
  // Use restaurant-provided/verified media when available;
  featuredDishNameEn?: string;
  featuredDishImageUrl?: string;

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

// #52 reviews after eating. Every review comes from a proven visit.
export type VisitKind = 'reservation' | 'check_in';

export interface Review {
  id: string;
  restaurantId: string;
  stars: number; // 1 to 5
  body: string;
  dietTags: Diet[]; // how the writer ate here, e.g. ['halal']
  visitKind: VisitKind; // "Verified visit · Booked" or "Location check-in"
  createdAt: string; // ISO date
  mine: boolean; // written by the signed-in user
}

// Asked from the database: may this user write a review here?
export interface ReviewEligibility {
  canReview: boolean;
  visitKind: VisitKind | null;
  alreadyReviewed: boolean;
  reason: 'login_required' | 'already_reviewed' | 'visit_required' | null;
}

export interface CheckInResult {
  checkedIn: boolean; // false = too far, nothing saved
  distanceM: number;
}

// #48 food personality: kinds of food and places a person likes.
// Only used to rank suggestions higher, never to hide anything.
export type FoodTag =
  | 'korean' | 'chinese' | 'japanese' | 'western' | 'asian-foreign' | 'noodles'
  | 'bbq' | 'buffet' | 'snack-food' | 'raw-fish' | 'chicken' | 'fast-food'
  | 'cafe' | 'pub' | 'halal-food' | 'cheap';

export interface FoodProfile {
  diets: Diet[];
  allergens: Allergen[];
  likes?: FoodTag[]; // #48. Optional so profiles saved before #48 still load.
  maxDistanceM: number;
  language: 'ko' | 'en';
}

export const DEFAULT_PROFILE: FoodProfile = {
  diets: [],
  allergens: [],
  likes: [],
  maxDistanceM: 1500,
  language: 'en',
};