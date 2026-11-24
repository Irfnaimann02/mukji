# Chain menus

Official menus of 15 franchise chains with branches in 안산, for the bulk-imported restaurants (033/034) that have no menu yet.
Collected on 2026-11-24 from each chain's own website only (no delivery apps, blogs or calorie sites).

- One JSON file per chain. `contains` / `may_contain` use the app's tags; `allergens_as_written` keeps the official wording;
  `source_url` is the page each dish came from; `notes` says how the chain's data was read and anything to watch out for.
- `evidence/` has a screenshot or copy of every allergen table that was used, so the data can be checked.
- `supabase/sql/037_chain_menus.sql` is generated from these files: `python scripts/chain_menus/build_037.py`.

| Chain | File | Dishes | Allergens from | Read how |
|---|---|---|---|---|
| 맘스터치 | momstouch.json | 60 | allergen table image | by eye - spot-check |
| 버거킹 | burgerking.json | 65 | allergen popup (text) | copied |
| 맥도날드 | mcdonalds.json | 48 | allergen page (text) | copied |
| 써브웨이 | subway.json | 29 | allergen chart image (● contains / ★ may contain) | by eye - spot-check |
| 프랭크버거 | frankburger.json | 31 | allergen sheet image | by eye - spot-check |
| 페리카나 | pelicana.json | 53 | item pages (text) | copied |
| bhc | bhc.json | 80 | item popups (site's product API) | copied |
| BBQ | bbq.json | 56 | site's menu API - not visible on the product page | copied, not confirmed on screen |
| 교촌치킨 | kyochon.json | 81 | allergen table image | by eye - spot-check |
| 본죽 | bonjuk.json | 54 | allergen table (text; direct / indirect) | copied |
| 롯데리아 | lotteria.json | 52 | **none published** - menu only | |
| 굽네치킨 | goobne.json | 46 | **none published** - menu only | |
| 이삭토스트 | isaac.json | 31 | **none published** - menu only | |
| KFC | kfc.json | 30 | **none published** (allergen page 404) - menu only | |
| 엽기떡볶이 | yupdduk.json | 26 | **none published** (field empty) - menu only | |

Menu-only chains have empty tags. `apply_chain_menus()` refuses them, because empty tags would show every dish as safe.
For the same reason it skips single dishes marked 'not shown' inside the other chains (e.g. BBQ 순살 치킨버거, 버거킹 프렌치프라이).
