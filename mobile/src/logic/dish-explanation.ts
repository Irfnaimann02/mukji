import type { Diet, Dish, DishStatus, FoodProfile, Ingredient, OriginLabel, Restaurant } from '@/data/types';

import type { OrderPhrase } from './order-phrases';
import { WORD } from './order-phrases';
import { HALAL_MEAT, blockedIngredients, dishStatus } from './profile-filter';

// #10 Why is a dish "Ask first" or "Avoid"?
// Worked out from the dish data only, so it is always shown, with or without AI.
// The AI explanation (Edge Function explain-dish) only rewords these facts.

// Which part of the user's profile rules an ingredient out.
export type Rule = Diet | 'allergy';

export type Reason =
  | { kind: 'contains'; ingredient: Ingredient; rules: Rule[] } // in the dish for sure
  | { kind: 'may_contain'; ingredient: Ingredient; rules: Rule[] } // might be, e.g. in the broth
  | { kind: 'halal_meat'; ingredient: Ingredient } // meat at a place that is not halal-certified
  | { kind: 'typical' }; // #103: from a generated typical menu, not this restaurant's real menu

export interface DishExplanation {
  status: DishStatus;
  reasons: Reason[];
  sources: {
    restaurant: string[]; // e.g. ['menu', '원산지 label', 'reviews']
    origin: OriginLabel[]; // only the lines about this dish
    verifiedCount: number;
    lastChecked: string | null;
  };
  questions: OrderPhrase[]; // Korean questions for the staff
}

const DIETS: Diet[] = ['halal', 'vegan', 'no_pork'];

const HALAL_QUESTION: OrderPhrase = {
  ko: '할랄 고기인가요?',
  rom: 'Halal gogi-ingayo?',
  en: 'Is the meat halal?',
};

// #103: for a dish from a generated typical menu, the first thing to find out.
export const TYPICAL_QUESTION: OrderPhrase = {
  ko: '이 메뉴에 뭐가 들어가요?',
  rom: 'I menyue mwoga deureogayo?',
  en: 'What is in this dish?',
};

// Korean words that show a 원산지 (origin) item is about this ingredient.
// e.g. '햄(돼지고기)' and '베이컨' are pork, '순살치킨' and '닭똥집' are chicken.
const ORIGIN_WORDS: Record<Ingredient, string[]> = {
  pork: ['돼지', '돈육', '삼겹', '목살', '햄', '베이컨', '소시지'],
  beef: ['소고기', '쇠고기', '한우', '우육'],
  chicken: ['닭', '치킨', '계육'],
  lamb: ['양고기', '양갈비', '양꼬치'],
  seafood: ['해산물', '새우', '오징어', '생선', '고등어', '연어', '장어', '도미', '광어', '전복', '조개', '낙지', '문어', '쭈꾸미', '참치', '어묵', '명태', '굴'],
  egg: ['계란', '달걀'],
  dairy: ['우유', '치즈', '버터'],
  wheat: ['밀가루'], // not '밀': 밀떡 is about tteok, matched below
  soy: ['대두', '두부'],
  peanut: ['땅콩'],
  alcohol: [],
};

// Food words shared by an origin item and a dish name, e.g. 밀떡 and 떡볶이, 쌀 and 비빔밥.
const SHARED_WORDS: string[][] = [['떡'], ['쌀', '밥', '죽'], ['김치'], ['두부'], ['면', '국수']];

// Only the 원산지 lines that are about this dish: one of its ingredients, or a food in its name.
// A chicken dish shows 순살치킨, not 쌀 or 밀떡.
export function relevantOrigin(dish: Dish, origin: OriginLabel[]): OriginLabel[] {
  const ingredients = [...dish.contains, ...dish.mayContain];
  return origin.filter(({ itemKo }) => {
    if (ingredients.some((i) => ORIGIN_WORDS[i].some((word) => itemKo.includes(word)))) return true;
    // 케밥 (kebab) contains 밥 but is not a rice dish.
    const name = dish.nameKo.split('케밥').join('');
    return SHARED_WORDS.some(
      (group) => group.some((w) => itemKo.includes(w)) && group.some((w) => name.includes(w)),
    );
  });
}

// The diets and allergies in the profile that block this ingredient.
export function rulesBlocking(ingredient: Ingredient, profile: FoodProfile): Rule[] {
  const rules: Rule[] = [];
  for (const diet of DIETS) {
    if (!profile.diets.includes(diet)) continue;
    const onlyThisDiet: FoodProfile = { ...profile, diets: [diet], allergens: [] };
    if (blockedIngredients(onlyThisDiet).has(ingredient)) rules.push(diet);
  }
  if ((profile.allergens as Ingredient[]).includes(ingredient)) rules.push('allergy');
  return rules;
}

export function explainDish(dish: Dish, restaurant: Restaurant, profile: FoodProfile): DishExplanation {
  const blocked = blockedIngredients(profile);
  const reasons: Reason[] = [];
  const questions: OrderPhrase[] = [];
  const status = dishStatus(dish, restaurant, profile);

  for (const ingredient of dish.contains) {
    if (!blocked.has(ingredient)) continue;
    reasons.push({ kind: 'contains', ingredient, rules: rulesBlocking(ingredient, profile) });
  }
  for (const ingredient of dish.mayContain) {
    if (!blocked.has(ingredient)) continue;
    reasons.push({ kind: 'may_contain', ingredient, rules: rulesBlocking(ingredient, profile) });
    const w = WORD[ingredient];
    questions.push({
      ko: `${w.ko} 들어갔어요?`,
      rom: `${w.rom[0].toUpperCase()}${w.rom.slice(1)} deureogasseoyo?`,
      en: `Does it have ${w.en} in it?`,
    });
  }

  // Same rule as dishStatus: with halal on, beef, chicken or lamb at a place that is not
  // halal-certified is "ask first" even if nothing else is wrong.
  if (profile.diets.includes('halal') && !restaurant.halalCertified) {
    const meat = [...dish.contains, ...dish.mayContain].find((i) => HALAL_MEAT.includes(i) && !blocked.has(i));
    if (meat) {
      reasons.push({ kind: 'halal_meat', ingredient: meat });
      questions.push(HALAL_QUESTION);
    }
  }

  // For something that is in the dish for sure, the useful question is whether it can be left out.
  const containsBlocked = reasons.filter((r) => r.kind === 'contains');
  if (dish.leaveOutKo && containsBlocked.length > 0) {
    questions.unshift({ ko: dish.leaveOutKo, en: dish.leaveOutEn ?? '' });
  } else {
    for (const reason of containsBlocked) {
      const w = WORD[reason.ingredient];
      questions.unshift({
        ko: `${w.ko} 빼 주세요.`,
        rom: `${w.rom[0].toUpperCase()}${w.rom.slice(1)} ppae juseyo.`,
        en: `Please leave out the ${w.en}.`,
      });
    }
  }

  // #103: a typical dish is a guess about this type of restaurant, so say that first and
  // ask what is really in it (otherwise a typical dish with no matching tag has no reason at all).
  if (dish.typical && status !== 'safe') {
    reasons.unshift({ kind: 'typical' });
    questions.unshift(TYPICAL_QUESTION);
  }

  return {
    status,
    reasons,
    sources: {
      restaurant: restaurant.sources,
      origin: relevantOrigin(dish, restaurant.origin),
      verifiedCount: dish.verifiedCount,
      lastChecked: dish.lastChecked,
    },
    questions,
  };
}
