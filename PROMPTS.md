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


## 2026-10-31 - #4 food profile filter (Nik Ammar)
- Tool: Claude
- Prompt: shared the team handoff for #4 and asked for help setting up and testing it; ran the handoff's filter code in a separate test folder with halal, vegan and egg-allergy profiles against the 3 mock restaurants.
- Output used: `profile-filter.ts` from the handoff (`blockedIngredients`, `dishStatus`, `restaurantFits`); halal output matches the handoff.
- Changes by me: left out `visibleDishes` (it belongs to #14, Adib); found that a drink alone makes a restaurant fit for vegans (Draft beer at Mock Chicken) and raised it with the team.