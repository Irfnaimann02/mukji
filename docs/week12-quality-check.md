# Week 12: two-angle review and pre-deploy check

Scope: the code written this sprint for #52 (reviews after eating), the shared test owner (#77), Send menu photo (#82) and lamb (#83), plus a pre-deploy check of the whole app.

## 1. Review from two angles

### Angle A: security (who can do what)

| # | Finding | Severity | Fix |
|---|---|---|---|
| A1 | The menu-photo limit (20 a day) counted database rows only. The photo is uploaded **before** the row is added, so a user at the limit could keep uploading files forever (the row fails, the file stays in storage). | Real | `025`: the storage upload itself is limited to 20 files per person per day. Tested: the 21st upload is refused. |
| A2 | Users could edit `photo_paths` on their own review, but there is no review-photo feature, so any text could be stored there. | Low | `025`: users can edit only stars, text and diet tags. |
| A3 | GPS check-in can be faked (raised by Aqil in #74). | Known | Not fixable with phone GPS. Check-ins are labelled "Location check-in", only completed reservations get "Verified visit". QR code at the counter is the follow-up idea. |
| A4 | The shared test owner (`owner-test@example.com`) owns a real restaurant (r16) and logs in with a password. Anyone with the password can see r16's booking requests. | Heads-up | Fine for the course. Delete it (`delete from owners where email = 'owner-test@example.com'`) before real users book TriBoTea. |
| A5 | Supabase advisor: 4 SECURITY DEFINER functions callable by signed-in users (`add_review`, `check_in`, `review_eligibility`, `my_menu_photos_today`). | Intended | They are the only way in: each one checks the login, the visit and the limits itself, and the tables block direct writes. |
| A6 | Supabase advisor: "anonymous access" on 9 tables. | Intended | Guests are signed-in anonymous users. Every policy checks ownership (`user_id = auth.uid()`), so a guest only reaches its own rows. Reviews and check-ins also refuse guests. |
| A7 | Supabase advisor: leaked-password protection is off. | Low | Only the test owner uses a password. Turn it on in Auth settings if the plan allows it. |

### Angle B: code quality (is it easy to change safely)

| # | Finding | Severity | Fix |
|---|---|---|---|
| B1 | `Alert.alert` does nothing on the web (react-native-web leaves it empty). 43 alerts in 15 files were silent in the browser. Worst case: the **Directions** button did nothing at all on the web, and error messages (too far to check in, daily photo limit) never showed. | Real | New `showAlert()` (`src/components/show-alert.ts`): same arguments; on the web it uses the browser's alert, confirm or a numbered prompt. Every `Alert.alert` now uses it. |
| B2 | The list of ingredients was copied in 4 places in the app (types, vegan list in the map pins, owner portal, profile form). Adding lamb meant changing all 4, and forgetting one would make the map and the menu disagree. | Real | One `ALL_INGREDIENTS` list in `types.ts` (typed so a new ingredient can't be left out); the map pins reuse the menu's vegan list; the profile form labels are a `Record`, so TypeScript refuses a missing one. |
| B3 | The review and menu-photo logic had no tests. | Real | `review-and-photo.test.ts`: average stars, error messages, and "Kakao places are sent by place ID only". |
| B4 | Layer rule (screens → logic → data): kept. Only `src/data` talks to Supabase. GPS and the photo picker are used in the components that need them. | OK | — |

### What one angle caught that the other missed

- **Only the security angle** found A1 (storage limit) and A2. The code itself was clean; the problem was in what the database allowed.
- **Only the code-quality angle** found B1 and B2. They are not security holes, but B1 broke the Directions button on the web and B2 is exactly how a "vegan" bug would come back.
- **Neither angle** found the web bugs in the menu-photo button (the Send button hidden behind the booking bar, and "not signed in" before a guest session started). Those were found by **clicking through the app** (see the smoke test below).

## 2. Pre-deploy check

| Check | Result |
|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ 0 errors |
| Lint (`npx expo lint`) | ✅ 0 problems |
| Unit tests (`npm test`) | ✅ 16 passed (week 12 core path 3 + lamb 2 + review/photo 3 + team's booking tests 8) |
| Web build (`npx expo export -p web`) | ✅ builds |
| Smoke test (`npm run e2e`, Playwright) | ✅ 5 flows pass. Fails as it should when mock-1 comes back or the lamb tag is removed. |
| Secrets in the repo | ✅ None. Only `mobile/.env.example`; the Kakao key stays in the Edge Function secret. |
| Every SQL file in `supabase/sql/` applied in Supabase | ⚠️ `021_featured_dish_media.sql` (#69) was never run: the app shows no featured photo, but nothing breaks. `025` is new and runs with this PR. |
| Supabase security advisor | ✅ No errors. Warnings explained in A5 to A7. |

### Smoke test flows (`mobile/e2e/smoke.e2e.ts`)

Read-only, against the real Supabase data:

1. The list shows real restaurants and no test data (mock-1 is gone).
2. Halal: Sarai's lamb kebab is "Ask first" (not certified), falafel is "Safe", Namwol's beer is "Avoid".
3. Vegan: lamb is "Avoid".
4. Peanut allergy: pad thai is hidden at Namwol Pho, and "Show" brings it back as "Ask first".
5. TriBoTea (no menu): the "No menu yet" card, the Send menu photo card and the guest "Log in to write a review" card.
