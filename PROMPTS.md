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

## 2026-11-12 - Batch 1.1 welcome, account exit and featured dish cards
- Tool: ChatGPT
- Prompt: asked to improve Batch 1 by using individual featured-dish photos for restaurant cards, provide a way to return to the welcome screen, and add a logout action in the Profile account card.
- Output used: optional featured-dish name/image fields for restaurant data; per-restaurant image selection in Home; a clear-app-mode action; a confirmed logout/back-to-welcome control in the account card.
- Changes by the team: sample restaurant photos and featured dish labels are illustrative mock content; replace them with restaurant-approved images and verified featured dishes when real data is available.

## 2026-11-12 — Batch 1.2 account sign-out and restaurant identity images

- AI assistance: diagnosed the welcome-screen return issue caused by the auth hook automatically creating a new anonymous guest session immediately after a deliberate sign-out. Added a one-time sign-out suppression path so the welcome screen remains available until the user chooses an experience again.
- Updated the account card into a structured MUKJI account panel with guest/member status, current app mode, Switch to Business Mode, and Sign Out actions. Guest sign-out now ends the guest session and returns to the welcome screen.
- Fixed Supabase restaurant mapping so featured dish fields are not discarded. When no restaurant image is stored yet, the app chooses a dish-specific image using the first menu item and a stable restaurant-specific variation. These are illustrative menu visuals, not verified official restaurant photographs or popularity claims.
- Files changed: `mobile/src/data/auth.ts`, `mobile/src/hooks/use-auth.ts`, `mobile/src/components/account-card.tsx`, `mobile/src/app/(tabs)/profile.tsx`, `mobile/src/data/restaurant-repository.ts`.

## 2026-11-12 — Batch 1.3 sign-out, owner preview and highest-priced dish images
- Tool: ChatGPT
- Prompt: asked to fix Sign Out returning to Search instead of Welcome, use each restaurant's highest-priced dish as its representative image, add more dish-image choices, and add a temporary Profile button to inspect the Business Owner page while the owner-account work is unfinished.
- Output used: shared/persisted sign-out suppression across all auth listeners; explicit guest-session start from Welcome; local-only owner portal preview using a sample restaurant and separate preview draft storage; highest-priced dish selection for restaurant card identity; expanded dish image mappings.
- Safety/authorization notes: preview mode does not create or grant an owner account, access the owners table, change Supabase records, bypass RLS, or publish local edits. Representative photos remain illustrative unless supplied and verified by the restaurant.
- Files changed: `mobile/src/data/auth.ts`, `mobile/src/data/app-mode.ts`, `mobile/src/hooks/use-auth.ts`, `mobile/src/app/index.tsx`, `mobile/src/app/owner/index.tsx`, `mobile/src/app/(tabs)/profile.tsx`, `mobile/src/data/restaurant-repository.ts`, `mobile/src/data/mock-restaurants.ts`.
