# MUKJI Owner Portal — Model 1 + Model 2 redesign

## Included changes
- `mobile/src/app/owner/index.tsx`
  - Replaces the bottom tab bar with a dark left navigation rail.
  - Keeps Home, Restaurants, Menus, Reservations and More.
  - Adds an Owner Portal language switch in More. It updates the same shared `foodProfile.language` preference used by the User Portal.
  - Adds a presentation-only reservations list in preview mode; live owner accounts continue using the existing Supabase-backed reservation component.
- `mobile/src/components/owner-dashboard.tsx`
  - Adds a restaurant-photo hero, analytics-style weekly activity chart, action-required panel and sample KPI values in preview mode.
  - Live accounts do not receive invented sales or analytics; they see an explanatory empty-state note until real data is available.
- `mobile/src/logic/owner-portal-service.ts`
  - Adds a dedicated, isolated Salam Kitchen preview restaurant and four sample dishes with food photography.
  - Preview records are local in-memory sample data and are never written to Supabase.

## Apply
Extract this ZIP into the repository root (`C:\dev\MUKJI\mukji`) and allow it to overwrite the three matching files.

## Open the presentation preview
1. Run the app in Expo development mode.
2. Open User Portal > Profile > Account settings.
3. Under Developer section, choose **Preview Business Owner Page**.
4. Navigate through all five sections using the left rail.
5. In More, switch English/Korean. This uses the same saved language preference as the User Portal.

The preview entry is development-only (`__DEV__`), as it was in the supplied project.

## Notes
- Preview analytics, reservations, restaurant and menu content are clearly sample/demo content. They are not live booking or sales records.
- Food/restaurant photos are loaded from Unsplash image URLs and therefore require an internet connection during the presentation.
- Existing login, owner-to-restaurant assignment, onboarding/verification, restaurant editing, menu/ingredient workflows, reservation operations, drafts and Supabase access rules are preserved.
- No database migrations, Supabase RLS policies, customer-facing screens or unrelated files are changed.
