import type { Dish, FoodProfile, Ingredient } from '@/data/types';

import { blockedIngredients } from './profile-filter';

export interface OrderPhrase {
  ko: string;
  rom?: string; // how to read it aloud; left out when the Korean comes from dish data
  en: string;
}

// Korean word, pronunciation and English for each ingredient in types.ts.
const WORD: Record<Ingredient, { ko: string; rom: string; en: string }> = {
  pork: { ko: '돼지고기', rom: 'dwaeji-gogi', en: 'pork' },
  beef: { ko: '소고기', rom: 'so-gogi', en: 'beef' },
  chicken: { ko: '닭고기', rom: 'dak-gogi', en: 'chicken' },
  seafood: { ko: '해산물', rom: 'haesanmul', en: 'seafood' },
  egg: { ko: '계란', rom: 'gyeran', en: 'egg' },
  dairy: { ko: '유제품', rom: 'yujepum', en: 'dairy' },
  alcohol: { ko: '술', rom: 'sul', en: 'alcohol' },
  peanut: { ko: '땅콩', rom: 'ttangkong', en: 'peanuts' },
  wheat: { ko: '밀가루', rom: 'milgaru', en: 'wheat' },
  soy: { ko: '콩', rom: 'kong', en: 'soy' },
};

const ALLERGY: OrderPhrase = { ko: '알레르기가 있어요.', rom: 'Allereugi-ga isseoyo.', en: 'I have a food allergy.' };
const BROTH: OrderPhrase = { ko: '육수에 고기가 들어갔어요?', rom: 'Yuksu-e gogi-ga deureogasseoyo?', en: 'Is there meat in the broth?' };
const THANKS: OrderPhrase = { ko: '감사합니다.', rom: 'Gamsahamnida.', en: 'Thank you.' };

const MIN_PHRASES = 3; // issue #9: at least 3 phrases
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function buildOrderPhrases(dish: Dish, profile: FoodProfile): OrderPhrase[] {
  const blocked = blockedIngredients(profile);
  const out: OrderPhrase[] = [{ ko: `${dish.nameKo} 하나 주세요.`, en: `One ${dish.nameEn}, please.` }];

  // Written by the team for this exact dish, e.g. '햄 빼 주세요'.
  if (dish.leaveOutKo) out.push({ ko: dish.leaveOutKo, en: dish.leaveOutEn ?? '' });

  // In the dish for sure: ask to leave it out.
  for (const i of dish.contains) {
    if (!blocked.has(i)) continue;
    const w = WORD[i];
    out.push({ ko: `${w.ko} 빼 주세요.`, rom: `${cap(w.rom)} ppae juseyo.`, en: `Please leave out the ${w.en}.` });
  }

  // Might be in the dish: ask.
  for (const i of dish.mayContain) {
    if (!blocked.has(i)) continue;
    const w = WORD[i];
    out.push({ ko: `${w.ko} 들어갔어요?`, rom: `${cap(w.rom)} deureogasseoyo?`, en: `Does it have ${w.en} in it?` });
  }

  if (profile.allergens.length > 0) out.push(ALLERGY);
  if (out.length < MIN_PHRASES) out.push(BROTH);
  out.push(THANKS);
  return out;
}