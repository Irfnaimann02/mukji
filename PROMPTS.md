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

## 2026-11-18 — #47 team menu review screen (Adib)
- Tool: Claude
- Prompt: people can send menu photos (#82), but nobody could turn them into dishes without editing the database by hand; asked for a screen in the app where only our team reviews the photos and approves the dishes.
- Output used: `supabase/sql/029_menu_review_team.sql` (a `team_members` table nobody can read from the app, `is_team_member()`, a storage policy so only the team can open the private photos, and team-only functions to list pending photos, save a draft, approve and reject); `data/menu-review-repository.ts`; `logic/menu-review.ts` with Jest tests (draft rows, tag and price parsing, row checks); the review screen `app/team-menu-review.tsx` (photo, "Read with AI" using the Menu Scanner, editable dish rows, Save, Approve with a confirm, Reject with a reason); a team-only card on the Profile tab (`components/team-menu-link.tsx`).
- Changes by me: approval reuses 016's `approve_menu_submission` instead of a second way to write dishes, and adds 'menu photo' to the restaurant's sources; Kakao-found places are refused until the restaurant is in our list, so dishes never point at a missing restaurant; the AI only fills the draft and a person must approve, matching the rule that menus are never invented. 029 was tested rolled back first, then run in Supabase; the screen was tested in the browser with sample data (51 tests, tsc and lint clean).
- Files changed: `supabase/sql/029_menu_review_team.sql` (new), `mobile/src/data/menu-review-repository.ts` (new), `mobile/src/logic/menu-review.ts` (new), `mobile/src/logic/__tests__/menu-review.test.ts` (new), `mobile/src/app/team-menu-review.tsx` (new), `mobile/src/components/team-menu-link.tsx` (new), `mobile/src/app/(tabs)/profile.tsx`, `mobile/src/i18n/translations.ts`, `PROMPTS.md`.
