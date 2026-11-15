import type { FoodTag, FoodType, Restaurant } from '@/data/types';

// #48 food personality.
// Tags are worked out from data every restaurant already has, so nobody has to type them in:
// the licence category (업태구분명), the food type and the price level.
// Tastes the data can't tell us (spicy, big portion, high protein...) come later with hand-added tags.

// Every tag in the order it is shown on the Profile tab.
export const FOOD_TAGS: FoodTag[] = [
  'korean', 'chinese', 'japanese', 'western', 'asian-foreign', 'noodles',
  'bbq', 'buffet', 'snack-food', 'raw-fish', 'chicken', 'fast-food',
  'cafe', 'pub', 'halal-food', 'cheap',
];

// Licence data 업태구분명 -> tags. Same category names as category_defaults (017).
const CATEGORY_TAGS: Record<string, FoodTag[]> = {
  '한식': ['korean'],
  '냉면집': ['korean', 'noodles'],
  '탕류(보신용)': ['korean'],
  '식육(숯불구이)': ['korean', 'bbq'],
  '중국식': ['chinese'],
  '일식': ['japanese'],
  '횟집': ['raw-fish'],
  '경양식': ['western'],
  '외국음식전문점(인도,태국등)': ['asian-foreign'],
  '분식': ['snack-food'],
  '김밥(도시락)': ['snack-food'],
  '뷔페식': ['buffet'],
  '통닭(치킨)': ['chicken'],
  '호프/통닭': ['chicken', 'pub'],
  '정종/대포집/소주방': ['pub'],
  '패스트푸드': ['fast-food'],
  '까페': ['cafe'],
};

// Kakao categories look like "음식점 > 일식 > 초밥,롤", so match words inside them.
// These also catch licence names that aren't in the list above.
const KEYWORD_TAGS: [RegExp, FoodTag[]][] = [
  [/한식/, ['korean']],
  [/중식|중국/, ['chinese']],
  [/일식|초밥|스시|돈까스|돈가스|라멘|우동|이자카야/, ['japanese']],
  [/양식|이탈리안|피자|파스타|스테이크/, ['western']],
  [/아시아|베트남|태국|인도|쌀국수/, ['asian-foreign']],
  [/국수|냉면|라면|우동|라멘|쌀국수|칼국수/, ['noodles']],
  [/고기|육류|삼겹살|갈비|숯불|구이/, ['bbq']],
  [/뷔페/, ['buffet']],
  [/분식|김밥|떡볶이/, ['snack-food']],
  [/횟집|생선회|(^|[ >,])회($|[ >,])/, ['raw-fish']],
  [/치킨|통닭/, ['chicken']],
  [/술집|호프|포장마차|이자카야/, ['pub']],
  [/패스트푸드|햄버거/, ['fast-food']],
  [/카페|까페|디저트/, ['cafe']],
  [/할랄/, ['halal-food']],
];

const FOOD_TYPE_TAGS: Record<FoodType, FoodTag[]> = {
  korean: ['korean'],
  chicken: ['chicken'],
  noodles: ['noodles'],
  cafe: ['cafe'],
  halal: ['halal-food'],
  other: [],
};

// Example: category '일식', price level 1 -> ['japanese', 'cheap']
// Example: Kakao category '음식점 > 일식 > 초밥,롤' -> ['japanese']
export function tagsFor(restaurant: Restaurant): FoodTag[] {
  const tags = new Set<FoodTag>(FOOD_TYPE_TAGS[restaurant.foodType] ?? []);
  const category = restaurant.category;
  if (category) {
    CATEGORY_TAGS[category]?.forEach((t) => tags.add(t));
    for (const [pattern, found] of KEYWORD_TAGS) {
      if (pattern.test(category)) found.forEach((t) => tags.add(t));
    }
  }
  if (restaurant.priceLevel === 1) tags.add('cheap');
  return [...tags];
}

// How many of the user's likes this restaurant matches.
export function likeMatches(restaurant: Restaurant, likes: FoodTag[] = []): number {
  if (likes.length === 0) return 0;
  const tags = tagsFor(restaurant);
  return likes.filter((like) => tags.includes(like)).length;
}
