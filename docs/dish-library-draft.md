# Dish library draft (#56)

Draft for review. Nothing is in the database yet: 013 (tables) and 014 (fill + link) come after this is agreed.
Checked on 2026-11-12 against all 274 real dishes (mock-1 left out) with `docs/dish-library-check.sql` (read-only).

## Result

| Status | Dishes | Meaning |
|---|---|---|
| **Danger** | **0** | Library misses an ingredient the stored tags have (would wrongly show Safe). Must stay 0. |
| Match | 119 | Library gives exactly the stored tags |
| Weaker | 42 | Stored says `contains`, library says `may_contain` (Avoid → Ask first). Shop-specific facts, see below |
| Stricter | 30 | Library adds a `may_contain` the stored tags don't have (more cautious) |
| Not linked | 83 | No base dish on purpose: Sarai and Ebisu specials, sets, sauces, combos. Stay hand-tagged |

191 of 274 dishes (70%) link to a base dish: 150 dishes, 23 sides, 18 drinks.

## How it works

1. **Clean the name:** remove spaces; 돈가스 → 돈까스, 만둣국 → 만두국, 쥬스 → 주스.
2. **Base dish:** the base word that **ends last** in the name wins (Korean puts the main dish at the end). Tie → the longer word.
   - 치즈돈까스 → 돈까스 · 돈까스김밥 → 김밥 · 만두국수 → 국수 · 멸치칼국수 → 칼국수
3. **Add-ons:** every add-on word found **outside** the base word. If two add-ons overlap, the longer one wins (닭고기, not 고기).
4. **Merge rule:** `contains` = base + add-ons. `may_contain` = (base + add-ons) minus `contains`.
   - Example: 만두라면 = 라면 (wheat | beef, pork, soy, egg, seafood) + 만두 (pork, wheat | beef, soy, egg) → **pork, wheat | beef, egg, seafood, soy**. Pork moves to `contains`.
5. **Not linked (hand-tagged):** names with 세트, 정식 or 소스, and combos like `A+B` where both sides are a dish (양푼비빔밥+된장찌개). Dishes with no base word stay hand-tagged too.
6. **Rule from #56:** if recipes differ between shops, the ingredient goes in `may_contain`. Never Safe by guessing.

## Check: r11 라면 family (all match)

| Dish | Base + add-ons | Library = stored |
|---|---|---|
| 라면 | 라면 | wheat \| beef, egg, pork, seafood, soy ✅ |
| 김치라면 | 라면 + 김치 | wheat \| beef, egg, pork, seafood, soy ✅ |
| 떡라면 | 라면 | wheat \| beef, egg, pork, seafood, soy ✅ |
| 치즈라면 | 라면 + 치즈 | dairy, wheat \| beef, egg, pork, seafood, soy ✅ |
| 만두라면 | 라면 + 만두 | pork, wheat \| beef, egg, seafood, soy ✅ |
| 짬뽕라면 | 라면 + 짬뽕 | seafood, wheat \| beef, egg, pork, soy ✅ |

## Base dishes (59)

`kind`: **dish** = a meal, **side** = extra or side, **drink** = a drink.

| base | kind | contains | may_contain |
|---|---|---|---|
| 김밥 | dish | egg, pork, seafood | soy, wheat |
| 야채김밥 | dish | egg | seafood, soy, wheat |
| 라면 | dish | wheat | beef, pork, soy, egg, seafood |
| 떡볶이 | dish | soy | wheat, seafood, egg, pork, beef |
| 라볶이 | dish | wheat, soy, seafood | egg |
| 돈까스 | dish | pork, wheat, egg | dairy, soy, beef |
| 만두 | dish | wheat, pork | beef, soy, egg, seafood |
| 만두국 | dish | wheat, egg, pork | beef, soy, seafood |
| 우동 | dish | wheat, seafood | soy, egg |
| 칼국수 | dish | wheat | seafood, egg, soy |
| 국수 | dish | wheat | seafood, egg, soy |
| 쌀국수 | dish | — | seafood |
| 냉면 | dish | wheat | beef, egg, soy |
| 쫄면 | dish | wheat, egg | soy |
| 김치찌개 | dish | pork | soy, seafood |
| 된장찌개 | dish | soy | seafood, beef, pork |
| 순두부찌개 | dish | soy | seafood, pork, egg |
| 부대찌개 | dish | pork, wheat, soy | beef, dairy |
| 찌개 | dish | — | soy, pork, seafood, beef |
| 덮밥 | dish | — | soy, wheat, egg, pork, seafood |
| 볶음밥 | dish | egg | soy, pork, seafood, wheat, chicken |
| 비빔밥 | dish | soy, egg | beef, wheat |
| 알밥 | dish | seafood | pork, soy, wheat, egg |
| 치킨 | dish | chicken, wheat | soy, egg, dairy, peanut |
| 순살 | dish | chicken, wheat | soy, egg, dairy, peanut |
| (뼈) | dish | chicken, wheat | soy, egg, dairy, peanut |
| 피자 | dish | wheat, dairy | soy, egg |
| 부리또 | dish | wheat | dairy, egg |
| 카레 | dish | wheat | pork, beef, dairy |
| 떡국 | dish | egg | beef, soy, seafood |
| 함박 | dish | beef, egg, wheat | pork, dairy |
| 육개장 | dish | beef | soy, egg, wheat |
| 갈비탕 | dish | beef | soy, egg, wheat |
| 불고기 | dish | beef, soy | pork, wheat |
| 떡갈비 | dish | soy | pork, beef, wheat, egg |
| 오무라이스 | dish | egg | pork, wheat, dairy, soy |
| 반미 | dish | wheat | egg, soy, pork |
| 팟타이 | dish | egg, seafood | peanut, soy |
| 핫도그 | dish | wheat | pork |
| 라면사리 | side | wheat | soy |
| 우동사리 | side | wheat | — |
| 튀김 | side | wheat | egg |
| 치즈스틱 | side | dairy, wheat | egg |
| 치즈볼 | side | dairy, wheat | egg |
| 공기밥 | side | — | — |
| 오뎅 | side | seafood, wheat | soy |
| 계란후라이 | side | egg | — |
| 감자 | side | — | wheat, dairy |
| 떡사리 | side | — | wheat |
| 사리 | side | — | — |
| 막걸리 | drink | alcohol | wheat |
| 맥주 | drink | alcohol | wheat |
| 소주 | drink | alcohol | — |
| 콜라 | drink | — | — |
| 사이다 | drink | — | — |
| 음료수 | drink | — | — |
| 생수 | drink | — | — |
| 주스 | drink | — | — |
| 식혜 | drink | — | — |

## Add-ons (46)

| word in name | contains | may_contain |
|---|---|---|
| 치즈 | dairy | — |
| 모짜 | dairy | — |
| 로제 | dairy | — |
| 눈꽃 | dairy | — |
| 만두 | pork, wheat | beef, soy, egg |
| 참치 | seafood | — |
| 어묵 | seafood, wheat | — |
| 오뎅 | seafood, wheat | — |
| 맛살 | seafood | — |
| 날치알 | seafood | — |
| 새우 | seafood | — |
| 굴 | seafood | — |
| 멸치 | seafood | — |
| 오징어 | seafood | — |
| 짬뽕 | seafood | — |
| 김치 | — | seafood, pork |
| 계란 | egg | — |
| 마요 | egg | — |
| 돈까스 | pork, wheat, egg | dairy, soy, beef |
| 제육 | pork, soy | — |
| 돼지고기 | pork | — |
| 베이컨 | pork | — |
| 페퍼로니 | pork | beef |
| 스팸 | pork | — |
| 햄 | pork | — |
| 소시지 | pork | — |
| 소고기 | beef | — |
| 불고기 | beef, soy | pork |
| 닭고기 | chicken | — |
| 치킨 | chicken | — |
| 고기 | — | pork, beef |
| 갈비 | — | pork, beef |
| 양념 | soy | peanut |
| 간장 | soy | — |
| 카레 | wheat | pork, beef, dairy |
| 회 | seafood | — |
| 장어 | seafood | alcohol |
| 모둠 | — | chicken, seafood |
| 모듬 | — | chicken, seafood |
| 미트볼 | — | pork, beef |
| 된장 | soy | seafood |
| 두부 | soy | — |
| 갈릭 | — | dairy |
| 함박 | beef, egg, wheat | pork |
| 콤비네이션 | pork | beef |
| 밀떡 | wheat | — |

## The 42 "weaker" dishes

These shops are known to use the ingredient for sure, so the stored `contains` is more exact than the library's general `may_contain`. **Proposal: existing dishes keep their stored tags** (they're shop-specific facts). The library is the starting point for new dishes, and you can still edit any dish by hand after.

| Pattern | Dishes | Stored has for sure |
|---|---|---|
| r07 Bukchon dumplings and 만둣국 | 갈비만두, 모둠만두, 북촌 군만두, 애기만두, 찐만두, 북촌 만둣국, 얼큰만둣국, 육개장 만둣국, 만두국수 | beef, soy (갈비만두: soy only) |
| r02 Alchon 알밥 | 갈릭, 갈릭치즈, 매콤, 매콤치즈, 순한, 약매, 진매, 짜장, 카레 알밥 | pork (ham) |
| 떡볶이 with 밀떡 / 어묵 | r04 국물·로제떡볶이 ×4, r05 국물떡볶이, r11 떡볶이, 치즈떡볶이, r03 밀떡사리 | wheat, seafood (r05 also pork) |
| r08 Hansot chicken mayo, r15 가라아게 | 치킨마요, 빅치킨마요, 메가치킨마요, 치킨가라아게 | soy |
| Kimchi with jeotgal | 묵은지 김치찌개, 김치 제육 덮밥, 스팸 김치볶음밥 | seafood |
| Others | 비빔국수, 북촌 피냉면, 오징어덮밥, 장어덮밥, 모둠 돈까스도련님, 볶음밥 (r03), 카오팟싸파롯, 사계천왕, 모듬튀김 | see check SQL |

## Decisions for you

1. **Existing dishes keep their stored tags** (proposal above). Yes / no?
2. **Lamb:** Sarai lamb dishes have no lamb tag (lamb isn't in the 10 ingredients; today it's `may_contain beef`). The library doesn't change this. Add `lamb` before 013, or keep the workaround?
3. **김치찌개 keeps `contains pork`.** Plain 김치찌개 is almost always pork; tuna versions say 참치 in the name. This bends the "differs → may" rule on purpose.
4. **Drinks and sides:** `kind` marks 18 drinks and 23 sides. The app could later skip drinks when it decides if a restaurant "fits" (the week 10 cola problem). That's an app change, so it's not part of #56.

## Next

- **013:** tables `base_dishes` and `add_ons` (with `kind`), `menu_submissions`, and link columns on `dishes`.
- **014:** fill the library from this draft and link the 191 dishes. Tags unchanged if decision 1 is yes.
