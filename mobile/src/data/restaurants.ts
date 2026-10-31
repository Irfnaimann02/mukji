export type FoodType = 'korean' | 'halal' | 'vegan' | 'cafe';

export type Restaurant = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  foodType: FoodType;
  badges: string[];
};

// Temporary test data for #1 until Adib's seed data (#3) is ready.
export const SEED_RESTAURANTS: Restaurant[] = [
  {
    id: 'test-1',
    name: 'Test Halal Kitchen',
    latitude: 37.2995,
    longitude: 126.839,
    foodType: 'halal',
    badges: ['halal', 'no-pork'],
  },
  {
    id: 'test-2',
    name: 'Test Bibimbap House',
    latitude: 37.2985,
    longitude: 126.8375,
    foodType: 'korean',
    badges: ['vegetarian-option'],
  },
  {
    id: 'test-3',
    name: 'Test Green Cafe',
    latitude: 37.295,
    longitude: 126.833,
    foodType: 'vegan',
    badges: ['vegan', 'no-pork', 'halal-friendly'],
  },
];