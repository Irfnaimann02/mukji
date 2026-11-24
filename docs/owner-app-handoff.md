# Handoff: Mukji owner version (restaurant side)

Give this file to your AI assistant together with the repository. It explains what to build and why, and what already exists.

## 1. Goal

Mukji today is the **customer app**: a food map that shows which restaurants and dishes fit a person's food profile (halal, vegan, no pork, allergies). Restaurant data is currently added by the team by hand (SQL files in `supabase/sql/`).

The **owner version** lets a restaurant owner (사장님) register their restaurant, prove they own it, and keep their own menu and ingredient data up to date. That makes the data more accurate, and it supports the revenue idea in `docs/proposal.md` ("Verified Friendly" listing).

## 2. Reference: how foodpanda onboards restaurants

We studied foodpanda Malaysia's partner sign-up (partner.foodpanda.my, 11 Nov 2026) as a model. Their flow has four stages:

1. **Short sign-up form**, verified by phone OTP:
   business name, owner first and last name, business type (Restaurant / Shop), business category (Regular Restaurant, Home Based Kitchen, Caterers, Street Food), number of branches, email, mobile phone (gets the OTP), "business phone same as mobile" checkbox, marketing opt-in.
2. **Documents**: business registration or licence, owner ID card, halal certificate (if applicable), dine-in menu.
3. **Review by staff**: 2 to 5 working days; they may call the owner.
4. **Go live checklist** after approval: upload menu and dish photos, set opening hours, choose a commission package, then switch the restaurant to active.

Good patterns to copy:
- Keep the first form short and let the rest happen after sign-up.
- Show fields depending on earlier answers (category appears only after choosing "Restaurant").
- "Approved" and "live" are two different states, with a checklist between them.
- The same entry point sends riders, customers and existing partners elsewhere.

## 3. Adapt it to Korea and to Mukji

Mukji launches around the ERICA campus in Ansan, so use Korean documents instead of the Malaysian ones:

| foodpanda MY | Mukji (Korea) |
| --- | --- |
| SSM / business licence | 사업자등록증 (business registration certificate) and/or 영업신고증 (food business report) |
| Owner IC | Owner ID (신분증); consider only checking the name matches, do not store the ID number |
| Halal certificate | Halal certificate (e.g. from KMF), only if they claim "Halal certified" |
| Dine-in menu | Menu photo; Mukji also needs **ingredients per dish** and the **원산지 label** |
| Commission package | Not needed now; later the "Verified Friendly" paid listing |

What Mukji needs that foodpanda does not:
- For every dish: what it **contains** and what it **may contain** (broth, sauce, stock), using the existing `Ingredient` list in `mobile/src/data/types.ts`: pork, beef, chicken, seafood, egg, dairy, alcohol, peanut, wheat, soy.
- Optional "what to leave out" text in Korean and English (`leave_out_ko`, `leave_out_en`).
- The 원산지 (origin) label: item and country.
- Only a restaurant with a real certificate may be "Halal certified"; everyone else is "halal-friendly" at most (see the trust system in `docs/proposal.md`).

## 4. What already exists in the repository

- **App**: Expo SDK 58, Expo Router, React Native 0.88, TypeScript, in `mobile/`. Read `mobile/AGENTS.md` first; it has rules for Expo (check the versioned docs, use `npx expo install`, run lint and typecheck).
- **Layers**: screens in `mobile/src/app/`, logic in `mobile/src/logic/`, data access in `mobile/src/data/` (`restaurant-repository.ts` is the only file that knows where restaurants come from).
- **Database (Supabase)**, see `supabase/sql/`:
  - `restaurants`: id, name_ko, name_en, food_type, lat, lng, address, phone, price_level, halal_certified, origin (jsonb), recommend_count, rating, sources, **status** (`pending` / `approved` / `rejected`), kakao_place_id, **public_data_id** (licence number from public data), location_source, reservation_url, created_at.
  - `dishes`: id, restaurant_id, name_ko, name_en, price_won, contains[], may_contain[], leave_out_ko, leave_out_en, verified_count, last_checked.
  - Row level security: the app can only **read approved** restaurants and their dishes. Nobody can write from the app yet.
- Many restaurants near ERICA are **already in the database** from public licence data (with `public_data_id`). So most owners will **claim an existing restaurant**, not create a new one.

## 5. Suggested owner flow

1. **Sign up / log in** as an owner (Kakao or Google login is already planned for customers; reuse it, or use email OTP. Phone SMS OTP needs a paid SMS provider in Supabase).
2. **Find your restaurant**: search existing restaurants by name or address. If found, "Claim this restaurant". If not, "Add a new restaurant".
3. **Short form**: restaurant name (Korean and English), owner name, category (restaurant, home kitchen, caterer, street food), number of branches, phone, email.
4. **Upload documents** to a private storage bucket: 사업자등록증 or 영업신고증, halal certificate (optional), menu photo, 원산지 label photo.
5. **Waiting for review**: the team approves in Supabase (status stays `pending` until then). Show the owner a clear status screen.
6. **Go live checklist** (after approval):
   - Add dishes with price and ingredients (contains / may contain)
   - Add 원산지 items
   - Opening hours
   - Dish photos (optional)
   - Reservation phone or URL
   - Publish
7. **Later**: edit menu, see how many Mukji users viewed the restaurant, reply to reviews, buy "Verified Friendly".

## 6. Database changes to plan (new SQL file, e.g. `supabase/sql/008_owners.sql`)

- `owners` (or `profiles` with a role): user id from Supabase Auth, name, phone, email.
- `restaurant_claims`: owner id, restaurant id (or new restaurant data), category, branch count, status (`pending` / `approved` / `rejected`), reviewer note, created_at.
- `claim_documents`: claim id, type (business_registration, food_business_report, halal_certificate, menu_photo, origin_label), storage path.
- On `restaurants`: `owner_id`, `opening_hours` (jsonb), maybe `is_live` separate from `status`.
- Supabase Storage bucket for documents, **private**: only the owner and admins can read.
- Row level security: an owner can update only **their own** restaurant and its dishes, and only after their claim is approved. Customers keep reading approved restaurants only.
- Owner edits should not overwrite community verification silently: when an owner changes a dish's ingredients, reset `last_checked` or mark it "updated by owner".

## 7. Decisions for the team (ask before building)

1. Same app with an owner area (e.g. an `(owner)` route group) or a separate small app or web page? A web page may be easier for owners on a laptop.
2. Login method for owners: Kakao, Google, email OTP or phone OTP.
3. Who approves claims and where: directly in the Supabase dashboard at first, or an admin screen.
4. Does an owner's dish data show immediately, or only after a team member checks it?

## 8. How to work (team rules)

- Create a GitHub issue first; one branch per issue; commit messages start with the issue number, e.g. `#22 add owner claim form`; open a pull request with `Closes #22`.
- Log AI use in `PROMPTS.md` (tool, prompt, what was used, what you changed).
- Run `npx expo lint` and `npx tsc --noEmit` before calling a task done.
- Never put API keys in the code; they go in `mobile/.env`.

## 9. Suggested first issues

1. Database: owners, claims, documents tables, storage bucket and RLS (`008_owners.sql`).
2. Owner login and role.
3. Find and claim a restaurant, or add a new one.
4. Document upload and "waiting for review" screen.
5. Menu editor: dishes with ingredients, 원산지, opening hours.
6. Go live checklist and publish.
