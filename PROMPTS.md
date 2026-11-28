# AI use log

Log every use of AI here: the tool, what we asked, what we used, and what we changed.

## 2026-10-14 - Project proposal and Week 07 worksheet
- Tool: Claude
- Prompt: asked for ideas to make the app stand out, then a project proposal, and then a draft of the Week 07 worksheet (architecture layers, issues, milestones). Also asked how the menu scanner can work without menus on Naver or Kakao Map.
- Output used: proposal structure, layer table, issue list, milestones, and the repository starter files
- Changes by the team: (fill in: renamed modules to match the repository, assigned owners, adjusted acceptance criteria)

## 2026-10-14 - Mobile tech stack
- Tool: Claude
- Prompt: asked whether one mobile app can run on both iOS and Android, and which framework to use.
- Output used: proposed tech stack table in the Week 07 worksheet (Expo, react-native-maps, Supabase, Kakao Local API)
- Changes by the team: (fill in after the team agrees on the stack)

## 2026-10-15 - New concept, prototype and onboarding
- Tool: Claude
- Prompt: shared the team's sketches and explained each screen (map first, five tabs, badges for every diet including pork, contact-only reservation, reviews, profile with QR); asked for a visual prototype, answers to open questions, an onboarding guide and updates to the repository and issues.
- Output used: clickable prototype, updated proposal, worksheet (architecture, decided tech stack, issues #1 to #21), README, docs/ONBOARDING.md, scripts/update-issues.sh
- Changes by the team: (fill in after the team reviews the prototype)

## 2026-10-31 - #1 Map screen (Aiman)
- Tool: Claude
- Prompt: asked for step-by-step guidance to build the map screen with react-native-maps: centre on ERICA, a pin per restaurant, food-type icon and badge count, and a preview card on tap.
- Output used: file structure across the three layers and the code for each step
- Changes by the team: typed every file by hand, fixed a missing import, tested on iPhone with Expo Go

## 2026-10-31 - #4 food profile filter (Nik Ammar)
- Tool: Claude
- Prompt: shared the team handoff for #4 and asked for help setting up and testing it; ran the handoff's filter code in a separate test folder with halal, vegan and egg-allergy profiles against the 3 mock restaurants.
- Output used: `profile-filter.ts` from the handoff (`blockedIngredients`, `dishStatus`, `restaurantFits`); halal output matches the handoff.
- Changes by me: left out `visibleDishes` (it belongs to #14, Adib); found that a drink alone makes a restaurant fit for vegans (Draft beer at Mock Chicken) and raised it with the team.

## 2026-10-31 - #6 Home suggestions nearby (Aiman)
- Tool: Claude
- Prompt: asked for guidance to build the Home list: distance filter (haversine), GPS with a campus fallback, food-type chips, badges, loading and error states, linking cards to the detail page, then using the saved profile.
- Output used: nearby-service.ts, use-current-location.ts and home.tsx structure and code
- Changes by the team: typed every file by hand, tested on iPhone with Expo Go

## 2026-11-04 - #15 Search page (Aiman)
- Tool: Claude
- Prompt: asked for guidance to finish the Search screen: popular searches based on the food profile, the 5 most recent searches saved on the phone, and results by restaurant or dish name.
- Output used: search-history-store.ts, search-service.ts and search.tsx structure and code
- Changes by the team: built the search bar and empty screen first, typed the rest by hand, tested on iPhone with Expo Go

## 2026-11-12 - #63 Web version for laptop demos (Adib)
- Tool: Claude (Claude Code)
- Prompt: asked to get the app running in a web browser. Claude found that `expo start --web` crashed with `window is not defined` (server rendering plus Supabase's AsyncStorage) and that `react-native-maps` has no web support.
- Output used: `"output": "single"` in `mobile/app.json`; new `mobile/src/app/(tabs)/index.web.tsx` that lists the restaurants instead of the map on web only. Claude opened the web build in a browser at phone size and checked the list, search, restaurant pages, the food profile filter and the Korean switch.
- Changes by me: joined the two versions of the web list after #62 changed getMapPins, kept the fuller list (icons, translated badges, loading/empty states), checked tsc on my laptop.

## 2026-11-12 - Batch 1.1 welcome and account exit
- Tool: ChatGPT
- Prompt: asked to improve Batch 1 with featured-dish photos, a way to return to the Welcome screen, and a logout action in the Profile account card.
- Output used: a clear-app-mode action and a confirmed logout/back-to-Welcome control in the account card.
- Changes by the team: restaurant-specific photos are deferred until the team agrees on an image policy and restaurants can provide or approve their own images.

## 2026-11-12 — Batch 1.2 account sign-out
- Tool: ChatGPT
- Prompt: asked to diagnose why the app returned to Search after sign-out and to keep the Welcome screen available until the user explicitly chooses an experience.
- Output used: a persisted sign-out suppression flag shared by auth listeners; an explicit guest-session start after the user chooses Continue as guest; a translated account card with guest/member status, app mode, and sign-out actions.
- Changes by the team: the sign-out flow now returns to Welcome instead of immediately creating another anonymous session. Restaurant and dish stock-photo selection is not included; see `ETHICS.md`.
- Files changed: `mobile/src/data/auth.ts`, `mobile/src/hooks/use-auth.ts`, `mobile/src/components/account-card.tsx`, `mobile/src/app/(tabs)/profile.tsx`, `mobile/src/i18n/translations.ts`.

## 2026-11-12 — Batch 1.3 owner portal and sign-out integration
- Tool: ChatGPT
- Prompt: asked to fix Sign Out returning to Search instead of Welcome, use highest-priced dish photos as representative restaurant images, add local-only owner portal preview, and integrate the owner portal with account and Welcome flows.
- Output used: local-only owner portal preview with separate preview draft storage; owner authentication and restaurant-link lookup; owner sign-out back to Welcome; separation of the owner screen, logic service, and local draft repository. The proposed representative-photo feature was deferred and is not included.
- Safety/authorization notes: preview mode does not create or grant an owner account, access or modify the Supabase owners table, bypass RLS, or publish local edits. Restaurant ownership remains controlled by the existing Supabase owner links and RLS.
- Files changed: `mobile/src/app/index.tsx`, `mobile/src/app/user-login.tsx`, `mobile/src/app/owner-login.tsx`, `mobile/src/app/owner/index.tsx`, `mobile/src/components/account-card.tsx`, `mobile/src/data/auth.ts`, `mobile/src/data/app-mode.ts`, `mobile/src/data/owner-drafts-store.ts`, `mobile/src/hooks/use-auth.ts`, `mobile/src/i18n/translations.ts`, `mobile/src/logic/owner-portal-service.ts`, `mobile/src/logic/welcome-service.ts`, `mobile/src/logic/session-service.ts`, `mobile/src/app/(tabs)/profile.tsx`, `ETHICS.md`.

## 2026-11-15 - PR #69 review fixes (ChatGPT)
- Tool: ChatGPT
- Prompt: asked to address the PR review feedback about hard-coded Home screen text and featured-dish image/name matching with the missing database columns.
- Output used: added English and Korean translation keys for Home screen copy; guarded featured-dish images so they are used only when the saved dish label matches the displayed featured dish; added a nullable SQL migration for the featured-dish name and image URL columns.
- Changes by the team: review the translations and migration, then test the Home screen in both languages and verify matching/mismatching featured-dish labels against representative database rows.

## 2026-11-15 — #48 food personality (Nik Ammar)
- Tool: Claude
- Prompt: asked how to build issue #48 (profile choices for cuisine, style, value and taste; matching restaurants rank higher) when no restaurant has tags yet.
- Output used: tags worked out automatically from data every restaurant already has (licence category 업태구분명, food type, price level 1 → cheap) in `logic/food-tags.ts`; a "Food personality" chip section on the Profile tab; on Home, places matching more picks are listed first, with the #7 score ordering places within each group.
- Changes by me: chose automatic tags first, and "matches first" instead of a small score bonus (Kakao places have no rating, so a bonus couldn't lift them); Kakao categories (e.g. 음식점 > 일식 > 초밥,롤) are kept so Kakao places get tags too; tastes the data can't tell (spicy, big portion, high protein, fine dining, all-you-can-eat) are left for hand-added tags later. `likes` is optional in FoodProfile so profiles saved before #48 still load.
- Files changed: `mobile/src/logic/food-tags.ts` (new), `mobile/src/data/types.ts`, `mobile/src/data/kakao-repository.ts`, `mobile/src/components/food-profile-form.tsx`, `mobile/src/logic/suggestion-ranker.ts`, `mobile/src/logic/nearby-service.ts`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.

## 2026-11-15 — Profile tab redesign (Nik Ammar)
- Tool: Claude (design mockup made in a separate Claude chat, code in this one)
- Prompt: asked to turn the Profile tab mockup into React Native code with the same profile fields, translation keys and FOOD_TAGS, no new packages.
- Output used: Profile tab = header, compact account card, "You avoid" summary with "N places nearby fit" and a "Saved" flash, Safety filters card (diet tiles, allergy grid, No pork shown as included under Halal/Vegan), Food personality card ("Ranking only"), App settings card (language, search distance). New Account settings screen (`app/account.tsx`) with Business Mode, a "Sign in with Kakao or Google (Soon)" placeholder for #19, the developer owner preview and Sign out. The account logic moved unchanged from `account-card.tsx` into `hooks/use-account.ts` so the card and the screen share it.
- Changes by me: chose to do the whole tab in this PR; left the mockup's Order card preview and the Tools button out for now.
- Files changed: `mobile/src/app/(tabs)/profile.tsx`, `mobile/src/app/account.tsx` (new), `mobile/src/hooks/use-account.ts` (new), `mobile/src/components/account-card.tsx`, `mobile/src/components/food-profile-form.tsx`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.

## 2026-11-17 — #50 reservation with date, time, people and dishes (Nik Ammar)
- Tool: Claude (design mockup made in a separate Claude chat, code in this one)
- Prompt: asked to build issue #50 (booking saves date, time, number of people and pre-ordered dishes in Supabase; cancelling alerts the restaurant in the owner portal) on top of the `reservations` table from #45 with no new packages, then to rebuild the screens to the approved Reservation mockup.
- Output used: `data/booking-repository.ts` (create, list mine, cancel, list for owned restaurants, owner confirm / decline / complete); `logic/booking-times.ts` and `logic/booking-details.ts` with Jest tests; the booking form (`app/reserve-form.tsx`: date cards, Lunch / Afternoon / Dinner time grid, people stepper, pre-order with quantities and Safe / Ask first / Avoid labels, name / phone / request, sticky summary bar); a "Request sent" screen (`app/booking-sent.tsx`); the Reservation tab rebuilt around booking requests (Ongoing / History, status timeline, pre-order list, Call, Directions, cancel with Undo); the owner portal's Reservations tab (`components/owner-reservations.tsx`) with an alert for bookings the customer cancelled.
- Changes by me: no database change (quantity = the dish id repeated in `dish_ids`; name, phone and request saved as labelled lines in `note`); removed the old "Do Reserve" phone / online flow everywhere so there is one "Request booking" button (Kakao-found places have no booking button; `reservation-contact-sheet.tsx` and `reservation-history-store.ts` are no longer used); Undo works by delaying the cancel about 5 seconds, because the database cannot un-cancel.
- Files changed: `mobile/src/data/booking-repository.ts` (new), `mobile/src/logic/booking-times.ts` (new), `mobile/src/logic/booking-details.ts` (new), `mobile/src/logic/__tests__/booking-times.test.ts` (new), `mobile/src/logic/__tests__/booking-details.test.ts` (new), `mobile/src/app/reserve-form.tsx` (new), `mobile/src/app/booking-sent.tsx` (new), `mobile/src/components/booking-parts.tsx` (new), `mobile/src/components/booking-status-pill.tsx` (new), `mobile/src/components/owner-reservations.tsx` (new), `mobile/src/app/restaurant/[id].tsx`, `mobile/src/app/(tabs)/reserve.tsx`, `mobile/src/app/owner/index.tsx`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.

## 2026-11-17 — #10 AI explanation, part 1: "Why?" (Nik Ammar)
- Tool: Claude
- Prompt: asked to build the "Why?" half of issue #10 ("Why?" on an ask-first dish shows a reason and its sources) before the team has picked an AI provider.
- Output used: `logic/dish-explanation.ts` (the reasons, sources and Korean staff questions worked out from the dish data, with Jest tests); `components/dish-why-sheet.tsx` (a "Why?" sheet on Ask first and Avoid dishes: AI wording, the data reasons, "Based on" sources and questions); `data/dish-explanation-repository.ts`; the Edge Function `supabase/functions/explain-dish` that rewords the facts with AI. It supports Anthropic, OpenAI or Gemini through the secrets AI_PROVIDER, AI_API_KEY and AI_MODEL. The team chose the Claude API (AI_PROVIDER=anthropic, AI_MODEL=claude-haiku-5-5); the request uses low effort and room for thinking in max_tokens, per the Claude Haiku 5.5 docs.
- Changes by me: the data-based reasons and sources always show, so the sheet works with no AI key; the AI only rewords the facts the app sends, and sources come from the data, not from the AI. Added a halal question (할랄 고기인가요?) for meat at places that are not halal-certified. After testing, the "Based on" list was changed to show only the 원산지 lines about the dish (matched by its ingredients or a food word in its name), not the restaurant's whole origin label. Then, at my request, the AI part was changed so it explains exactly what is unsure for this dish and this user (e.g. halal slaughter, pork broth or lard, alcohol in sauces such as 맛술, shared frying oil) and suggests 2–4 Korean questions for the staff that fit the dish, shown first in the sheet; the data-based reasons, 원산지 and fixed questions stay as the fallback when AI is off. The Menu Scanner is a separate PR.
- Files changed: `mobile/src/logic/dish-explanation.ts` (new), `mobile/src/logic/__tests__/dish-explanation.test.ts` (new), `mobile/src/components/dish-why-sheet.tsx` (new), `mobile/src/data/dish-explanation-repository.ts` (new), `supabase/functions/explain-dish/index.ts` (new), `mobile/src/components/dish-list.tsx`, `mobile/src/logic/order-phrases.ts` (export WORD), `mobile/src/i18n/translations.ts`, `PROMPTS.md`.

## 2026-11-17 — #10 AI explanation, part 2: Menu Scanner (Nik Ammar)
- Tool: Claude
- Prompt: asked to build the Menu Scanner half of issue #10 (a test menu photo returns dishes marked safe / ask first / avoid, each ask-first dish with a Korean question), stacked on the part 1 branch, with no new packages.
- Output used: the Edge Function `supabase/functions/scan-menu` (reads a menu photo into dish names, prices and likely ingredients from the app's ingredient list; same secrets as explain-dish, plus an optional AI_SCAN_MODEL; one file so it deploys like kakao-places); `logic/menu-scan.ts` with Jest tests (checks the photo, turns the answer into dishes, runs the app's own `dishStatus`, takes a Korean question for each Ask first dish from `explainDish`); `data/menu-scan-repository.ts`; the Menu Scanner screen `app/scan-menu.tsx` (take or choose a photo, summary counts, one row per dish with its status, the staff question and "Why?"); a card into it on Home and on the restaurant page (`components/scan-menu-card.tsx`).
- Changes by me: the AI never decides the status and never sees the user's profile; it is told to put an ingredient in "may contain" when unsure. Scanned dishes can show Safe, with a clear "read from a photo by AI, not checked" warning. Scanned at a restaurant in the app, its halal certificate and 원산지 lines still count; scanned from Home, the place counts as not halal-certified. No image resizing package: the picker uses quality 0.5 and the app refuses photos over Claude's 5 MB limit. Photos are not stored.
- Files changed: `supabase/functions/scan-menu/index.ts` (new), `mobile/src/logic/menu-scan.ts` (new), `mobile/src/logic/__tests__/menu-scan.test.ts` (new), `mobile/src/data/menu-scan-repository.ts` (new), `mobile/src/app/scan-menu.tsx` (new), `mobile/src/components/scan-menu-card.tsx` (new), `mobile/src/components/dish-why-sheet.tsx`, `mobile/src/app/restaurant/[id].tsx`, `mobile/src/app/(tabs)/home.tsx`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.

## 2026-11-18 — #50 fix: the owner can cancel a booking (Nik Ammar)
- Tool: Claude
- Prompt: teammates found that the owner can't cancel a booking in the owner portal, e.g. when the customer phones to cancel instead of cancelling in the app; asked to fix it.
- Output used: `supabase/sql/026_owner_cancels_booking.sql` (the owner policy from 012 now also allows 'cancelled'; a new `cancelled_by` column set by a database trigger to 'customer' or 'restaurant', never by the app; only waiting or confirmed bookings can be cancelled; old cancelled rows marked 'customer'); in the owner portal a "Cancel booking" link on waiting and confirmed bookings with a confirm dialog, a "Cancelled by your restaurant" line, and the "Cancelled by the customer" alert no longer counting the owner's own cancellations; the customer's history shows "Cancelled by the restaurant"; `booking-repository.ts` reads `cancelled_by` and falls back to the old columns until 026 is run, so bookings keep loading.
- Changes by me: chose to record who cancelled (instead of reusing "Declined" or a neutral alert). The SQL was tested on a local Postgres copy of the 011 + 012 setup: the owner cancel failed before 026 and works after; customer and owner cancels are recorded correctly; cancelling a completed booking is refused; nobody can set `cancelled_by` directly; 026 can be re-run.
- Files changed: `supabase/sql/026_owner_cancels_booking.sql` (new), `mobile/src/data/booking-repository.ts`, `mobile/src/components/owner-reservations.tsx`, `mobile/src/app/(tabs)/reserve.tsx`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.
## 2026-11-18 — #4 map pins fade for diets too (Nik Ammar)
- Tool: Claude
- Prompt: asked why map pins only fade for allergies, and to fix it so the map matches Home and Search for diets (halal, vegan, no pork).
- Output used: `fadeReason` in `logic/profile-filter.ts` ('allergy' when every dish has one of the user's allergens, the #14 rule; 'diet' when no dish is Safe for the profile, the same `restaurantFits` rule Home and Search use; never faded with no menu yet); `fadedFor` on MapPin in `logic/map-pins.ts`; the map preview shows "No dish here is Safe for your diet" for the diet case; Jest tests for both cases, certified places, diet + allergy together, and no menu.
- Changes by me: rebuilt on current main instead of using the old 15 Nov patch, because #84 changed `map-pins.ts` and `restaurant-preview.tsx`; the allergy message wins when both apply.
- Files changed: `mobile/src/logic/profile-filter.ts`, `mobile/src/logic/map-pins.ts`, `mobile/src/components/restaurant-preview.tsx`, `mobile/src/components/restaurant-pin.tsx` (comment), `mobile/src/i18n/translations.ts`, `mobile/src/logic/__tests__/profile-filter.test.ts`, `PROMPTS.md`.

## 2026-11-19 — #10 AI goes live: time limit, retry when busy, clearer prompts (Adib)
- Tool: Claude
- Prompt: asked to deploy the `explain-dish` and `scan-menu` Edge Functions and switch the AI to Gemini's free tier to avoid costs; when "Why?" showed "AI explanation isn't available", asked to find the cause in the function logs and fix it; then asked to check a real menu scan (일미닭갈비) against the photo.
- Output used: both functions deployed; in both, a time limit per AI call (25 s for "Why?", 45 s for a scan, so 3 tries stay under Supabase's 150 s limit), up to 2 retries when the provider answers busy (Gemini 503, Claude 529), and Gemini's thinking level set to low; a scanner prompt rule for short meat names in combo names (닭·삼 / 쭈·삼 = 삼겹살 pork belly, 쭈 = 쭈꾸미, 제육 / 목살 = pork, 차돌 = beef) with English names written in full; an explain prompt rule not to mention field names such as "mayContain".
- Changes by me: the logs showed Gemini's free tier hanging until Supabase stopped the call and answering 503 "high demand" (gemini-4-hydrogen and gemini-3.8-flash; gemini-3.6-flash is paid only), so I switched to Claude Haiku (the team's first choice) on $5 prepaid credit with auto-reload off, so spending stops when the credit runs out; the 027 daily limits stay on. I set the API key in the Supabase dashboard myself; it was never shared in chat. In the real scan, 30 items and their prices matched the photo, but 닭·삼 came out as "Chicken and 삼" and only Ask first; I confirmed 삼 means 삼겹살 at a 닭갈비 place and approved the prompt fix.
- Files changed: `supabase/functions/explain-dish/index.ts`, `supabase/functions/scan-menu/index.ts`, `PROMPTS.md`.
## 2026-11-19 — #4 two small race fixes: map pins and food profile loading (Nik Ammar)
- Tool: Claude
- Prompt: asked to fix two open concerns from #4: map pins could go stale when the profile is toggled quickly, and a profile tap right after the app starts could be overwritten by the saved profile.
- Output used: an `active` guard in the pins effect of `map.tsx` and `map.web.tsx`, so only the latest request sets the pins; in `use-profile.tsx` a `changedByUser` ref, so the saved profile is ignored if the user already changed it, plus logged errors instead of unhandled ones when the phone storage can't be read or written.
- Changes by me: kept it to the map and the profile hook; no behaviour change apart from the two races.
- Files changed: `mobile/src/app/(tabs)/map.tsx`, `mobile/src/app/(tabs)/map.web.tsx`, `mobile/src/hooks/use-profile.tsx`, `PROMPTS.md`.

## 2026-11-18 — #47 team menu review screen (Adib)
- Tool: Claude
- Prompt: people can send menu photos (#82), but nobody could turn them into dishes without editing the database by hand; asked for a screen in the app where only our team reviews the photos and approves the dishes.
- Output used: `supabase/sql/029_menu_review_team.sql` (a `team_members` table nobody can read from the app, `is_team_member()`, a storage policy so only the team can open the private photos, and team-only functions to list pending photos, save a draft, approve and reject); `data/menu-review-repository.ts`; `logic/menu-review.ts` with Jest tests (draft rows, tag and price parsing, row checks); the review screen `app/team-menu-review.tsx` (photo, "Read with AI" using the Menu Scanner, editable dish rows, Save, Approve with a confirm, Reject with a reason); a team-only card on the Profile tab (`components/team-menu-link.tsx`).
- Changes by me: approval reuses 016's `approve_menu_submission` instead of a second way to write dishes, and adds 'menu photo' to the restaurant's sources; Kakao-found places are refused until the restaurant is in our list, so dishes never point at a missing restaurant; the AI only fills the draft and a person must approve, matching the rule that menus are never invented. 029 was tested rolled back first, then run in Supabase; the screen was tested in the browser with sample data (51 tests, tsc and lint clean).
- Files changed: `supabase/sql/029_menu_review_team.sql` (new), `mobile/src/data/menu-review-repository.ts` (new), `mobile/src/logic/menu-review.ts` (new), `mobile/src/logic/__tests__/menu-review.test.ts` (new), `mobile/src/app/team-menu-review.tsx` (new), `mobile/src/components/team-menu-link.tsx` (new), `mobile/src/app/(tabs)/profile.tsx`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.
## 2026-11-18 — #48 restaurant categories from licence data (Adib)
- Tool: Claude
- Prompt: food personality (#48) needs each restaurant's type, but 12 of our restaurants had no category; I gave the 행정안전부 식품_일반음식점 licence file (the same source as 004) and asked to fill the category from it.
- Output used: `supabase/sql/028_restaurant_categories.sql`, which sets `category` to the licence's 업태구분명 for r01–r08, r10–r12 and r15 (e.g. 에비수 → 일식, 김밥천국 → 분식). Dishes, tags and Safe / Ask first / Avoid don't change.
- Changes by me: each row must match both our id and the licence number (`public_data_id`), so a wrong id can't get the wrong category; r16 TriBoTea stays '까페' because its licence only says 기타 (other); renumbered from 026 to 028 because #91 took 026. Tested rolled back first, then run in Supabase and checked: 12 rows updated, all 13 licences still 영업/정상.
- Files changed: `supabase/sql/028_restaurant_categories.sql` (new), `PROMPTS.md`.

## 2026-11-20 — PR #97 business-onboarding review fixes (ChatGPT)
- Tool: ChatGPT
- Prompt: asked to address the PR review blocker and improvements for business onboarding: explain collection purpose and retention, let applicants delete a draft and its private files, add the personal-data handling note, move Supabase calls into the data layer, document AI assistance, use a correctly prefixed commit message, and test web document uploads.
- Output used: a privacy and retention notice in English and Korean; a draft-deletion flow with a draft-only RLS policy and cleanup of associated private Storage objects; a data repository behind the logic service; a web-specific file reader using the selected browser URI; and documentation updates in `ETHICS.md` and this log.
- Changes by the team: review the interim retention rule (drafts remain until applicants delete them; no automatic expiry exists), approve a production retention schedule before launch, and run the browser upload/deletion tests against the configured Supabase project.

## 2026-11-20 — #48 every Ansan restaurant: load by map area, licence import (Adib)
- Tool: Claude
- Prompt: our lecturer asked for most Ansan restaurants to be in the app; asked to import every open licensed restaurant in 안산시 from the licence file, and first to change how the app loads restaurants so thousands of them still work.
- Output used: `restaurant-repository.ts` no longer downloads every restaurant with every dish; it asks for restaurants near a point (new `restaurants_near` function, nearest first, at most 600), by id (favourites, bookings, one restaurant page), or by a search word (name, food type or dish), and a short hand-added list for the owner portal; `restaurant-service.ts`, search, favourites, reserve and the owner portal use these; Jest tests with a fake Supabase client (near-point request, ids in groups of 100, a search word cannot change the query); `032_restaurants_by_area.sql` (`bulk_import` column, a (lat, lng) index, `restaurants_near`); `033_ansan_restaurants_import.sql` with 7,533 open restaurants (일반음식점) and `034_ansan_rest_restaurants_import.sql` with 1,487 cafés, burger chains and snack shops (휴게음식점), and their generator `supabase/tools/ansan_import.py`.
- Changes by me: the lecturer allowed generated data, but we agreed to keep it honest in layers: real licence data first, then chain menus, then clearly marked typical menus that can never show Safe. Import only 영업/정상 places with coordinates and a fixed place (no 출장조리 / 푸드트럭); add the 휴게음식점 file too, because McDonald's, 롯데리아, 버거킹 and most cafés are licensed there, not as 일반음식점, but leave out its convenience stores, kids cafés and stalls in stations, cinemas and department stores; keep Daebu island, which the first draft wrongly cut as outside Ansan; skip a second licence next to a restaurant we already have (e.g. 남월 한양대점 beside r10); store no owner names; one line undoes the import (`bulk_import`). Coordinates checked against 004's values (0 m difference). Tested on a local copy (7,532 rows, re-run safe) and rolled back on Supabase. After review (Soy05, Irfan): `restaurants_near` now also checks the real distance, because the search box kept its corners (up to about 40% further than the radius), and the app filters by distance too; a SQL test and a Jest test place a restaurant in the box corner and check it is left out (the SQL test fails on the old 032).
- Files changed: `mobile/src/data/restaurant-repository.ts`, `mobile/src/logic/restaurant-service.ts`, `mobile/src/logic/search-service.ts`, `mobile/src/logic/owner-portal-service.ts`, `mobile/src/app/(tabs)/favourites.tsx`, `mobile/src/app/(tabs)/reserve.tsx`, `mobile/src/logic/__tests__/restaurant-loading.test.ts` (new), `supabase/sql/032_restaurants_by_area.sql` (new), `supabase/sql/033_ansan_restaurants_import.sql` (new), `supabase/sql/034_ansan_rest_restaurants_import.sql` (new), `supabase/tools/ansan_import.py` (new), `mobile/src/logic/geo.ts` (new), `mobile/src/logic/nearby-service.ts`, `mobile/src/logic/__tests__/restaurants-near-radius.test.ts` (new), `supabase/tests/032_restaurants_near_radius.sql` (new), `PROMPTS.md`.


## 2026-11-24 - #54 PR4 restaurant applications
- Tool: ChatGPT
- Prompt: continue the MUKJI Owner Portal roadmap after PR3, using the latest uploaded repository backup and the Owner Portal master plan; implement new restaurant registration, existing restaurant claiming, application submission and status display.
- Output used: a private restaurant-application data model and repository, applicant-owned draft policies, a server-side submission function, a bilingual application screen, and validation tests.
- Changes by me: reviewed the generated implementation and prepared the migration and tests. Full project checks and Supabase application are pending local verification.

## 2026-11-24 — #102 Official chain menus for 안산 franchise branches (Adib)
- Tool: Claude (Claude Code with a browser)
- Prompt: asked to collect the official current menu and allergen data of 15 Korean chains (맘스터치, 롯데리아, 버거킹, 맥도날드, 프랭크버거, 써브웨이, KFC, BBQ, bhc, 굽네, 교촌, 페리카나, 본죽, 이삭토스트, 엽기떡볶이) from each chain's own website only, never guessing, mapped to our tags; then to make it importable.
- Output used: `supabase/data/chains/*.json` (742 dishes; 10 chains with official allergen data, 5 menu-only because the chain publishes none), screenshots in `supabase/data/chains/evidence/`, `scripts/chain_menus/build_037.py`, and the generated `supabase/sql/037_chain_menus.sql` (team-only `chain_menus` / `chain_menu_dishes` tables and `apply_chain_menus()`, which only fills branches that have no dishes yet and refuses menu-only chains).
- Changes by me: chose the 15 chains from how many branches each has in the Ansan licence data (fast food, then chicken, then 본죽, 이삭토스트, 엽기떡볶이) and set the rules: official sites only, never guess, keep screenshots. In review: 16 items inside the 10 allergen chains had 'not shown' allergens and would have been copied with empty tags, so they would show as Safe (e.g. BBQ 순살 치킨버거 for halal, 뿜치킹 통새우 멘보샤 for a shellfish allergy); `apply_chain_menus()` now skips them. Added `chicken` to BBQ 닭볶음탕 (the site wrote '닭고기. 쇠고기' and the chicken was lost) and `lamb` to Subway's two 램 sandwiches. Renumbered to 037 because Aqil's #100 uses 036. The app now hides a price of 0 (chain sites rarely show prices) instead of showing ₩0, and a booking total says '+ ?' when a dish has no price. Tested on a local copy with all 9,020 imported restaurants: 136 branches filled, 8,151 dishes, re-run adds nothing, menu-only chains refused; the remaining dishes with no tags are ones the official table lists with no allergens (e.g. 본죽 흰죽). After Nik's review: fish is not on Korea's allergen list, so 6 fish dishes had no seafood tag (e.g. bhc 빠삭 먹태구이 showed Safe for vegan); added `seafood` to bhc 빠삭 먹태구이, 교촌 아, 귀한먹태, Subway 참치 and 본죽 추어죽 / 불고기낙지죽 / 참치야채죽, and `alcohol` as may-contain for 맘스터치 셰프스 버번치킨 and Subway 치킨 데리야끼. Before running in Supabase: spot-check the image-read chains (맘스터치, 써브웨이, 교촌, 프랭크버거) against `evidence/`, and a few BBQ items in the BBQ app.
- Files changed: `supabase/data/chains/` (new), `scripts/chain_menus/build_037.py` (new), `supabase/sql/036_chain_menus.sql` (new), `PROMPTS.md`.

## 2026-11-24 — #54 PR5 Owner Dashboard
- Tool: ChatGPT
- Prompt: continue the Owner Portal roadmap from the latest merged `main` backup and implement the owner dashboard without assuming that future business, branch, document-review or audit-log tables already exist.
- Output used: a bilingual dashboard overview, an owner-scoped dashboard repository for business/restaurant application statuses and pending reservation requests, summary logic with tests, and dashboard integration into the existing Owner Portal.
- Changes by me: the dashboard reports only data available in the current schema. It counts linked restaurants rather than inventing business/branch groupings; it does not fabricate document-review counts, verification states, or a full activity log. The dashboard notes these limitations until the corresponding management workflows are implemented.
- Files changed: `mobile/src/components/owner-dashboard.tsx` (new), `mobile/src/data/owner-dashboard-repository.ts` (new), `mobile/src/logic/owner-dashboard.ts` (new), `mobile/src/logic/__tests__/owner-dashboard.test.ts` (new), `mobile/src/app/owner/index.tsx`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.

## 2026-11-24 — #103 Typical menus for every restaurant type (Adib)
- Tool: Claude (Claude Code)
- Prompt: the lecturer said most Ansan restaurants should show a menu and generated data is fine if it is honest; asked for a low-confidence "typical menu" per licence category (업태구분명) for every restaurant that still has no dishes after the chain menus.
- Output used: `supabase/data/typical/typical_menus.json` (15 menus, 79 dishes, each tagged with what it usually contains), `scripts/typical_menus/build_038.py`, the generated `supabase/sql/038_typical_menus.sql` (`dishes.typical` column, team-only `typical_menus` / `typical_menu_dishes`, `apply_typical_menus()`, and a trigger that deletes a restaurant's typical dishes as soon as a real dish is added), and the app rule plus banner.
- Changes by me: decided the honesty rules: a typical dish is never Safe for anyone with a diet or allergy (it shows Ask first, Avoid still applies), the menu shows a banner saying it is not this restaurant's real menu, prices are 0 so none is shown, and real data always replaces it. Left vague categories (기타, 뷔페식, 외국음식전문점, etc.) empty instead of guessing. Ran after 037 so chain branches get their official menu. Tested on a local copy of all 9,020 restaurants: about 7,260 filled, 1,594 left empty, re-run safe, a real dish removes the typical ones, anon cannot read the source tables.
- Files changed: `supabase/data/typical/` (new), `scripts/typical_menus/build_038.py` (new), `supabase/sql/038_typical_menus.sql` (new), `mobile/src/data/types.ts`, `mobile/src/data/restaurant-repository.ts`, `mobile/src/logic/profile-filter.ts`, `mobile/src/components/dish-list.tsx`, `mobile/src/i18n/translations.ts`, `mobile/src/logic/__tests__/profile-filter.test.ts`, `ETHICS.md`, `PROMPTS.md`.

## 2026-11-24 — #54 PR6 Restaurant Management
- Tool: ChatGPT
- Prompt: continue the Owner Portal roadmap from the latest merged `main` backup; inspect the current restaurant schema and owner links before implementing editable restaurant information, operating details and photos.
- Output used: `039_owner_restaurant_management.sql` adds owner-editable description, opening hours, closing days and facilities, a restaurant photo metadata table and a public restaurant-photo bucket. `owner-restaurant-management-repository.ts` loads and saves only restaurants linked through `public.owners`, uploads/removes listing photos, and checks the authenticated owner. `owner-restaurant-management.ts` validates profile fields, coordinates, URLs, opening hours and facilities. `owner-restaurant-management.tsx` provides a bilingual mobile-first editor integrated into the existing Owner Portal.
- Changes by me: owners can update ordinary restaurant information only on approved restaurants assigned to their account. The migration grants update access only to profile columns; restaurant status, halal certification, public-data identifiers, ratings and other verification fields remain protected. The editor supports up to five public restaurant photos (8 MB each), opening hours, closing days, facilities and map coordinates. The Owner Portal now loads the exact restaurant IDs assigned in `public.owners`, including approved bulk-import listings, instead of filtering only the short hand-curated restaurant list. Preview mode is read-only. The migration must be applied in Supabase before using these new fields and photo uploads. Uploaded photos are stored as public listing media and previewed in the owner editor; rendering them on customer-facing pages remains outside this Owner Portal PR. Dependency installation timed out in the isolated implementation environment, so full Expo typecheck, lint and Jest checks still need to be run from the local `mobile` directory.
- Files changed: `supabase/sql/039_owner_restaurant_management.sql` (new), `mobile/src/data/owner-restaurant-management-repository.ts` (new), `mobile/src/logic/owner-restaurant-management.ts` (new), `mobile/src/logic/__tests__/owner-restaurant-management.test.ts` (new), `mobile/src/components/owner-restaurant-management.tsx` (new), `mobile/src/app/owner/index.tsx`, `mobile/src/logic/owner-portal-service.ts`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.

## 2026-11-24 — #109 Search map: pins only when zoomed in, names under pins (Adib)
- Tool: Claude (Claude Code)
- Prompt: the Search map shows far too many restaurants when zoomed out; only show them once the map is zoomed in enough. Also show each restaurant's name under its pin so people know the place before tapping. Then: pins still overlap and look messy at a wide view, so make them smaller as you zoom out.
- Output used: `mobile/src/logic/map-zoom.ts` (`zoomedInEnough`, `pinsInView`), the map screen change, and tests.
- Changes by me: chose the rule: no pins past the dot size, a "Zoom in to see restaurants" hint instead, and when zoomed in only the pins on screen are drawn (with a 10% edge margin) so the phone isn't drawing 600 markers. "Search this area" hides while zoomed out. The selected pin stays visible. Pins shrink in steps as you zoom out: full pin with count and name (Korean name in Korean mode) up to about 650 m tall (latitudeDelta 0.006), icon only up to about 1.3 km (0.012; the map opens at 0.01), a small coloured dot up to about 3.3 km (0.03), then nothing. The tapped pin is always full size with its name. Each size anchors the circle's centre on the spot so pins don't jump between sizes, and the marker key includes the size because Android only redraws a custom marker when its key changes. While checking the pins: a restaurant with only a typical menu (#103) was still getting "No pork" / "Vegan option" badges from generated dishes; it now gets no badges. (Fading typical-only places is left to Nik's #110, which fades them for anyone with a diet or allergy.) In review (Nik): the count badge was positioned on the whole pin, which is as wide as the name label, so it sat at the end of the name; the circle and badge are now wrapped together so the badge stays on the circle.
- Files changed: `mobile/src/logic/map-zoom.ts` (new), `mobile/src/components/restaurant-pin.tsx`, `mobile/src/logic/__tests__/map-zoom.test.ts` (new), `mobile/src/logic/__tests__/map-pins-typical.test.ts` (new), `mobile/src/app/(tabs)/map.tsx`, `mobile/src/logic/map-pins.ts`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.

## 2026-11-24 — #50 / #10 / #4 follow-up for chain menus (#105) and typical menus (#107) (Nik Ammar)
- Tool: Claude
- Prompt: asked to fix the points found while reviewing #105 and #107 that are in my own files.
- Output used: `preorderTotalLabel` in `booking-details.ts` (all priced → ₩9,000; some without a price → "₩4,500 + ?"; none → "?") used in the booking form, Reservation tab, booking-sent screen and owner portal, and pre-order lines no longer show ₩0; typical dishes can't be pre-ordered (`reserve-form.tsx`); `explainDish` gives a typical dish a "typical menu, not this restaurant's real menu" reason and the question 이 메뉴에 뭐가 들어가요? first, and the "Why?" sheet shows it; `explain-dish` is told when a dish is typical (needs a redeploy); a new map fade reason 'typical' so places with only a typical menu are faded for allergy-only profiles too, with its own preview message; tests for all of it.
- Changes by me: chose one PR for the three issues because all of it comes from the same two reviews.
- Files changed: `mobile/src/logic/booking-details.ts`, `mobile/src/components/booking-parts.tsx`, `mobile/src/app/reserve-form.tsx`, `mobile/src/app/(tabs)/reserve.tsx`, `mobile/src/app/booking-sent.tsx`, `mobile/src/components/owner-reservations.tsx`, `mobile/src/logic/dish-explanation.ts`, `mobile/src/components/dish-why-sheet.tsx`, `mobile/src/data/dish-explanation-repository.ts`, `supabase/functions/explain-dish/index.ts`, `mobile/src/logic/profile-filter.ts`, `mobile/src/logic/map-pins.ts`, `mobile/src/components/restaurant-preview.tsx`, `mobile/src/i18n/translations.ts`, tests in `mobile/src/logic/__tests__/` (booking-details, dish-explanation, profile-filter), `PROMPTS.md`.

## 2026-11-24 — #19 cancelled: remove the Kakao/Google "coming soon" row (Nik Ammar)
- Tool: Claude
- Prompt: the team cancelled #19 (Kakao and Google login), so I asked to remove its placeholder from the app.
- Output used: the "Sign in with Kakao or Google · Soon" row is gone from Account settings, along with its three translation keys (en and ko) and the now-unused `badge` option of the row.
- Changes by me: decided to drop #19 and to ship this as a second commit on the follow-up PR. Guest data and the email-code login from #54 are unchanged.
- Files changed: `mobile/src/app/account.tsx`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.
## 2026-11-24 — #54 PR7: Owner Menu Management and Food Suitability (GPT-6)
- Prompt: asked to continue the Owner Portal roadmap from the clean, updated `main` snapshot and complete PR7 (Menu Management and Food Suitability), providing a ZIP of changed/new files instead of a patch.
- Output used: `supabase/sql/041_owner_menu_management.sql` adds owner-scoped menu fields and RPCs, public menu-item photo storage, and a team review queue for ingredient changes; `mobile/src/components/owner-menu-management.tsx` replaces the old local-only menu draft editor with live menu CRUD, category/availability controls and photo management; owner ingredient claims remain pending until team approval; customer menu and pre-order screens show menu photos, omit unavailable items from ordering and keep unreviewed ingredient claims at Ask first; the team menu review screen can approve/reject owner ingredient claims.
- Safety decisions: existing chain and generated typical-menu rows cannot be edited/deleted by owners; owners cannot directly write trusted ingredient arrays or verification state; new owner menu items are Ask first until branch-specific ingredient information is reviewed; the public halal-certification status remains controlled by Mukji verification.
- Files changed: `supabase/sql/041_owner_menu_management.sql` (new), `mobile/src/components/owner-menu-management.tsx` (new), `mobile/src/data/owner-menu-management-repository.ts` (new), `mobile/src/logic/owner-menu-management.ts` (new), `mobile/src/logic/__tests__/owner-menu-management.test.ts` (new), `mobile/src/app/owner/index.tsx`, `mobile/src/app/team-menu-review.tsx`, `mobile/src/data/menu-review-repository.ts`, `mobile/src/logic/menu-review.ts`, `mobile/src/data/types.ts`, `mobile/src/data/restaurant-repository.ts`, `mobile/src/components/dish-list.tsx`, `mobile/src/app/reserve-form.tsx`, `mobile/src/logic/profile-filter.ts`, `mobile/src/logic/__tests__/profile-filter.test.ts`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.
- Verification status: TypeScript syntax transpilation and `git diff --check` passed. Full `npm ci`, TypeScript type-check and Jest could not be run in this environment because dependencies were unavailable; apply migration 041 and test the Supabase-backed flows before merging.

## 2026-11-25 — #54 PR8: harden owner-menu SECURITY DEFINER search paths (GPT-6)
- Prompt: continue PR8 from the clean PR7 merge and review the latest owner-menu SQL for security hardening opportunities.
- Output used: `042_owner_menu_function_search_path.sql` changes all seven PR7 owner/team `SECURITY DEFINER` functions to use an empty `search_path`, matching the safer pattern already used by the business-onboarding and restaurant-application RPCs. `supabase/tests/042_owner_menu_function_search_path.sql` checks that all seven functions exist as `SECURITY DEFINER` functions and retain the empty search path.
- Security decision: this is an additive migration; it does not change table permissions, owner/team authorization checks, function arguments, or application behaviour. The migration must be applied to the development Supabase project before the regression check is run.
- Verification status: not run against Supabase yet. Full mobile lint, TypeScript and Jest checks are not applicable to this SQL-only change but should still be run as part of the PR8 integration check.
- Files changed: `supabase/sql/042_owner_menu_function_search_path.sql` (new), `supabase/tests/042_owner_menu_function_search_path.sql` (new), `PROMPTS.md`.

## 2026-11-25 — #54 Owner Portal redesign (GPT-6)

- Tool: ChatGPT (GPT-6)
- Prompt: asked to redesign the existing MUKJI Owner Portal using a professional restaurant-management dashboard, combining a left-sidebar layout with an analytics-focused Home page. Requested a complete presentation preview with sample restaurant and food images, sample menu items, reservation examples and dashboard analytics, while preserving existing owner functionality and adding an English/Korean language switch under More.
- Output used: redesigned owner portal navigation and theme; dashboard with restaurant hero, KPI cards, activity graph and action-required section; updated restaurant, menu and reservation management presentation; More section with language preference controls; preview experience with sample restaurant information and presentation data.
- Changes by the team: applied the generated changes to the existing project, corrected lint issues, checked the TypeScript and lint results, and reviewed the implementation to preserve existing owner authentication, restaurant assignment, restaurant editing, menu management and reservation workflows. Preview data remains separate from real owner data.
- Files changed: `mobile/src/app/owner/index.tsx`, `mobile/src/app/owner-business.tsx`, `mobile/src/app/owner-login.tsx`, `mobile/src/app/owner-register.tsx`, `mobile/src/app/owner-restaurant-application.tsx`, `mobile/src/components/owner-dashboard.tsx`, `mobile/src/components/owner-menu-management.tsx`, `mobile/src/components/owner-reservations.tsx`, `mobile/src/components/owner-restaurant-management.tsx`, `mobile/src/constants/owner-portal-theme.ts`, `mobile/src/i18n/translations.ts`, `mobile/src/logic/owner-portal-service.ts`, `docs/owner-portal-ui-spec.md`, `README.md`, `PROMPTS.md`.

## 2026-11-25 — #118 Owner approval and team access to any restaurant (Adib)
- Tool: Claude (Claude Code)
- Prompt: the owner sign-up keeps getting stuck; make it possible for the 4 of us to act as the owner of any restaurant, and also make the normal case work where a real owner signs up and gets approved.
- Found while checking: nothing ever approved an application or added the owner to `owners`, so an owner waited forever; and SQL 036 (the restaurant application table) had never been run on the live database, so the restaurant application step could not save.
- Output used: `supabase/sql/043_owner_approval_team_access.sql` (team-only list of submitted applications with business details and documents; approve or reject with a message, approve adds the applicant to `owners`; team members can open and close any restaurant as owner, marked `owners.via_team`; team read access to the private documents bucket), its test `supabase/tests/043_owner_approval_team_access.sql`, and a team-only Owner tools screen with a Profile card.
- Changes by me: chose to add owners rows instead of changing every owner security rule, so all of Aqil's existing owner checks stay as they are. Reject needs a reason; a "new restaurant" is only approved by linking it to an existing listing (it has no map position); close only removes team links, never a real owner. Kept the new screen out of the Owner Portal and the menu-review screen to avoid clashing with Aqil's open #116. Tested 043 locally on a copy of every migration (re-run safe; checks for strangers, team, applicant), and against the live database together with 036 in a rolled-back transaction.
- Files changed: `supabase/sql/043_owner_approval_team_access.sql` (new), `supabase/tests/043_owner_approval_team_access.sql` (new), `mobile/src/data/team-owner-repository.ts` (new), `mobile/src/logic/team-owner-tools.ts` (new), `mobile/src/logic/__tests__/team-owner-tools.test.ts` (new), `mobile/src/app/team-owner-tools.tsx` (new), `mobile/src/components/team-owner-link.tsx` (new), `mobile/src/app/(tabs)/profile.tsx`, `mobile/src/i18n/translations.ts`, `ETHICS.md`, `PROMPTS.md`.

## 2026-11-26 — #122 Owner Portal review fixes
- Tool: ChatGPT (GPT-6) with the repository ZIP supplied by the project owner; changes were prepared for manual application.
- Prompt: inspect every review comment on PR #122 against the latest supplied repository snapshot, fix the preview authentication mismatch, localization gaps, inactive analytics period controls, outdated Owner Portal UI specification, and missing prompt provenance while preserving the existing security boundaries.
- Decisions: keep the development preview unauthenticated and read-only; do not recreate the deleted shared `owner-test@example.com` account or embed a shared password. Require an authorized owner session only for private reservations. Mark period filters as coming soon until real period-based metrics exist. Confirm the five-item bottom navigation as the final mobile Owner Portal layout.
- Validation scope: source-level inspection and static checks only; no live Supabase, device, or end-to-end authentication/reservation test is claimed.

## 2026-11-26 — #123 Team reads only submitted owner documents (Adib)
- Tool: Claude (Claude Code)
- Prompt: review our own #121 as if we were Aqil; then fix what that review found.
- Found: 043's storage rule let team members read the whole private `owner-business-documents` bucket, including files from drafts an owner never submitted. The app only showed submitted documents, but the database allowed more than ETHICS.md section 8 says.
- Output used: `supabase/sql/044_team_document_access_submitted_only.sql` (a yes/no helper `owner_document_is_submitted` and the replaced storage policy) and its test `supabase/tests/044_team_document_access_submitted_only.sql`.
- Changes by me: kept it to the one policy; applicants' own rules (030/035) are unchanged. Checked that the test fails on the old 043 rule ("team could read a draft document") and passes on 044, locally and against the live database in a rolled-back transaction. The other finding (rejection reason not shown on the owner dashboard) is already fixed in Aqil's #122.
- Files changed: `supabase/sql/044_team_document_access_submitted_only.sql` (new), `supabase/tests/044_team_document_access_submitted_only.sql` (new), `ETHICS.md`, `PROMPTS.md`.


## 2026-11-26 — #119 S17 Save profile and favourites to the account (Nik)
- Tool: Claude (Claude Code)
- Prompt: build #119: the food profile, favourites and recent searches were saved only on the phone, so they were lost on a new phone and the next person signing in on the same phone saw them. Save them to the email account, keep guests on the phone, copy the guest data once at the first sign-in, clear the phone at sign-out.
- Found while checking: booking history is already in the account (`reservations`, #50); `reservation-history-store.ts` is not used anywhere, so it was left alone.
- Output used: `supabase/sql/045_user_saved_data.sql` (`user_profiles` and `user_favourites`, own rows only and email logins only via `is_real_login()`; `merge_guest_saved_data` copies the phone's guest data once: the account's profile wins if it has one, favourites are added, restaurants that no longer exist are skipped, searches merged to 5) and its test; the app side in `saved-data-sync.ts` (loads the account at each start, sends offline changes first, clears the phone on sign-out) with the stores keeping their old functions so no screen changed.
- Changes by me: chose to save recent searches to the account too; the app language stays a phone setting (not saved in the account, kept at sign-out); a guest's data is also wiped when the guest session ends; moving a guest's bookings and reviews into the account is left out of #119. Favourites save to the account first, so an offline tap shows the usual error message instead of the phone and account disagreeing; profile changes save on the phone at once and are sent later if offline.
- Checked: all 45 migrations run in order on a local Postgres copy, 045 re-runs safely, and its test passes (fails if the guest rule or the execute revoke is removed). App logic and sync tests (33 new) pass with the rest of the suite in Claude's stand-in runner; strict type-check of the changed files.
- Files changed: `supabase/sql/045_user_saved_data.sql` (new), `supabase/tests/045_user_saved_data.sql` (new), `mobile/src/logic/saved-data.ts` (new), `mobile/src/logic/__tests__/saved-data.test.ts` (new), `mobile/src/data/saved-data-remote.ts` (new), `mobile/src/data/saved-data-owner.ts` (new), `mobile/src/data/saved-data-sync.ts` (new), `mobile/src/data/profile-store.ts` (new), `mobile/src/data/__tests__/saved-data-sync.test.ts` (new), `mobile/src/data/favourites-store.ts`, `mobile/src/data/search-history-store.ts`, `mobile/src/hooks/use-profile.tsx`, `mobile/src/logic/session-service.ts`, `ETHICS.md`, `PROMPTS.md`.

## 2026-11-28 — #119 review fixes (Nik)
- Tool: Claude (Claude Code)
- Prompt: Adib's review of #119: the first sign-in copy kept the account's profile, so a diet or allergy set on the phone was dropped (account had halal from an old phone, the new phone's guest added a peanut allergy, peanut dishes could show Safe); combine diets and allergies from both, add a test; and confirm before a guest sign-out wipes the profile.
- Output used: `merge_guest_saved_data` (SQL 045) now combines diets and allergies (account's first, then the phone's new ones); food likes and distance stay the account's. The app also copies again if the profile changes on the phone while the copy runs, and loads the combined profile before the phone counts as the account's, so no restriction is lost in that window. The guest sign-out message now says the food profile, favourites and recent searches are removed from this phone, with a "Log in" button to keep them.
- Changes by me: kept the existing sign-out dialog and its key instead of a new screen; the web version shows the numbered choice with "Log in" first.
- Checked: the new SQL test (Adib's peanut case) fails on the old rule and passes on the new one; all migrations and SQL tests pass locally; 4 new app tests and 1 updated (the copy-window test fails on the old sign-in code); en/ko keys still match.
- Files changed: `supabase/sql/045_user_saved_data.sql`, `supabase/tests/045_user_saved_data.sql`, `mobile/src/data/saved-data-sync.ts`, `mobile/src/logic/saved-data.ts`, `mobile/src/logic/__tests__/saved-data.test.ts`, `mobile/src/data/__tests__/saved-data-sync.test.ts`, `mobile/src/hooks/use-account.ts`, `mobile/src/i18n/translations.ts`, `ETHICS.md`, `PROMPTS.md`.
