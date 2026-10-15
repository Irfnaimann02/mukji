# Mukji — AI+X Project Proposal

## Summary

Mukji (먹지, "eat?") is a food map for **everyone in Korea**, whatever they eat. Naver Map and Kakao Map tell you where a restaurant is; Mukji tells you **whether you can eat there, what to order, and how to ask for it in Korean**, based on your own food profile.

The same map serves a halal student, a vegan exchange student, a classmate with a peanut allergy and a Korean friend who loves pork. Every restaurant carries badges for what it serves (pork, beef, seafood, vegan options, alcohol) and the app works out which places fit each user.

It works at the **dish level**, not only the restaurant level. Each dish carries a status (safe, ask first, avoid) with ordering tips such as "no meat, broth only". AI explains each status from the menu, the 원산지 (origin) label and community reviews, and an AI Menu Scanner reads paper menus.

Launch area: the ERICA campus surroundings, with 15 to 20 verified restaurants. Long-term goal: integrate the data layer into Kakao Map or Naver Map.

## Problem

People with food rules struggle to know what they can eat because the information is missing at the moment they decide.

- **Map apps list places, not diets.** Naver Map and Kakao Map show where restaurants are, but not which dishes fit a halal, vegan or allergy-safe diet.
- **Menus are in Korean.** Foreign users cannot read or translate ingredients accurately.
- **Hidden ingredients.** Broths, sauces and stocks often contain meat or allergens that the menu does not mention.
- **Restaurant-level information is too coarse.** A restaurant may be unsuitable overall, yet have one or two dishes that work with a small change.
- **Groups with mixed diets.** Friends with different food rules struggle to find one place that works for everyone.
- **Wrong choices are costly.** People arrive, discover there is nothing suitable, and lose time and money.

## Target users

A halal-only app has a small market, so Mukji serves everyone who chooses food by what they can or want to eat.

| Group | Main need |
| --- | --- |
| Muslim and halal-friendly eaters | Halal certified or halal-friendly places, no pork or alcohol |
| Vegan and vegetarian people (Korean and international) | Plant-based dishes and how to order them |
| People with allergies | Avoid ingredients such as peanuts, shellfish or eggs |
| International students, exchange students and tourists | No Korean; need help reading menus and ordering |
| Korean users with no restriction | Find places by food type (pork, seafood, price, portion) and eat with friends who have rules |

Including people with no restriction matters: it makes Mukji useful to every Korean user, which is what a company such as Kakao or Naver would need before adopting it.

## Solution

Mukji answers one question: **"Can I eat here, and what do I order?"**

1. **Map first.** The app opens on a 2D map of the area around you. Each restaurant pin shows a logo for its food type, with more badges stacked behind it. Pins that fit your profile are outlined; the rest fade.
2. **Two layers of badges.** "What they serve" (pork, beef, chicken, seafood, vegan options, alcohol, kid-friendly) comes from data. "Who it fits" (halal, halal-friendly, vegan, peanut-free) is worked out from that data and the user's food profile.
3. **Dishes, not just restaurants.** A restaurant page lists dishes as safe, ask first or avoid, with what to leave out ("고기 빼고").
4. **AI explains.** "Why?" on any dish gives the reason and its sources, plus a Korean question for the staff.
5. **Korean order card.** One tap shows a large Korean sentence to show the staff.
6. **Public reviews with diet tags.** Reviews show the reviewer's diet and can confirm or correct a dish status, so data improves with use.

## App structure

The app has five bottom tabs and opens on the map. The clickable prototype is at https://claude.ai/artifact/Ruqs4wU1dTWFEm2D2ojS4z.

| Tab | What it does |
| --- | --- |
| Search map (centre, opens first) | 2D map with a search bar, food-type pins and badge stacks; the search page shows popular searches for your preferences and your recent searches; a camera icon opens the Menu Scanner |
| Home | Coupang Eats style: search bar, food types to slide through, suggested restaurants nearby filtered by your profile |
| Reserve | Restaurant and History tabs; a restaurant page ends with "Do reservation", which shows the phone number (Call, Copy), the group-size note and a Korean sentence to read on the phone |
| Favourites | Starred restaurants with a private note each, plus a history of viewed places |
| Profile | Photo, name, view profile, QR code to add friends, settings, friends list and invite link, and "My food profile" (diet, allergies, price range, distance, food amount, kid or pet friendly) |

Reservation is contact only: most places near campus take bookings by phone, often only for 4 or more people, so the app helps the user call instead of building a booking system.

## Features and scope

| Feature | Description | Level |
| --- | --- | --- |
| Map screen | Opens first; 2D map, food-type pins with badge stacks | MVP (Week 11) |
| Five bottom tabs | Home, Reserve, Search map, Favourites, Profile | MVP |
| Restaurant and dish data | 15+ restaurants near ERICA with badges, dishes, 원산지 and phone number | MVP |
| Food profile and filter | Diet, allergies, price, distance, amount; pins and lists filtered by it | MVP |
| Restaurant detail page | Badges, dishes with status, 원산지, Do reservation | MVP |
| Home suggestions | Nearby restaurants filtered by profile and food type | MVP |
| Search page | Popular searches by preference, recent searches | MVP |
| Reserve tab | Contact card, Korean phone sentence, history | MVP |
| Trust badge and AI confidence | Verification count, last-checked date, confidence level | MVP |
| Korean order card | Large Korean sentence to show staff | MVP |
| Bilingual UI | Korean and English throughout | MVP |
| AI explanation and Menu Scanner | "Why?" per dish; scan a paper menu | Execution package (Week 13) |
| Login | Kakao and Google | Execution package |
| Favourites with private notes | Star, note, history | Execution package |
| Profile, QR and friends | Add friends by QR or invite link | Execution package |
| Public reviews | Stars, text, photos, diet tag, status check | Execution package |
| Co-op (eat together) | Combine friends' profiles; show places that fit everyone | Stretch |

## AI role

AI is used to **explain and read**, not to act as a halal authority.

**AI explanation.** For each dish marked ask first or avoid, AI writes the reason in plain language from the menu text, the 원산지 label and reviews, lists its sources, and generates a Korean question for the staff.

**Menu Scanner.** The user photographs a paper menu; AI extracts the Korean text, translates dish names, identifies the written ingredients and compares them with the user's food profile.

| Level | Meaning | App action |
| --- | --- | --- |
| Safe | No problem ingredient written on the menu | Suggest, with a general reminder |
| Ask first | May fit, but depends on broth, sauce or stock | Show the Korean question to confirm |
| Avoid | Clear conflict with the profile | Avoid, offer a change if one exists |

**Acknowledged limit:** AI only sees what is written. Ingredients not named on the menu cannot be detected, which is why "safe" never means "guaranteed".

**Where data comes from**

- **원산지 label.** Korean restaurants must display where their meat comes from, which shows whether pork or beef is served.
- **Asking the owner (사장님).** The team confirms dishes in person for the demo restaurants.
- **Reviews.** Users with the same diet confirm or correct dish statuses.
- **On-site menu photos.** The scanner works on any physical menu, board or kiosk; the app does not scrape Naver Map or Kakao Map.

## Trust system

- **Community-based, not certified.** Only restaurants with a real certificate get "Halal certified"; others are "halal-friendly" at most.
- **Verification badge.** Each dish shows how many people verified it and when it was last checked.
- **AI confidence level.** Each restaurant shows how sure the app is and what it is based on.
- **Ask the staff as the final step.** "Ask first" always comes with a Korean question.
- **Learning loop.** After eating, users tap "status was right" or "wrong".
- **Fixed disclaimer.** "Based on the menu, 원산지 and community reviews. Please confirm with the restaurant."

## Differentiation

| Aspect | Map apps and typical diet-filter apps | Mukji |
| --- | --- | --- |
| Core question | Where is the restaurant? | Can I eat here, and what do I order? |
| Audience | One diet group | Everyone, through a personal food profile |
| Unit of information | Restaurant | Dish, with what to leave out |
| Help at the restaurant | None | Korean order card and staff questions |
| Reviews | Stars only | Reviewer's diet shown; reviews correct dish data |
| Data honesty | A single badge | Confidence level with sources, count and date |
| AI | Usually none | Explains each status; reads paper menus |

## Revenue model

1. **"Verified Friendly" listing for restaurants.** Restaurants pay for a verified badge and promotion to customers who filter by diet.
2. **Campus partnerships.** University international offices offer the app to exchange and new students.
3. **Coupons from nearby restaurants.** Location-based promotions shown to users who fit the restaurant.
4. **Long term: data integration.** License the diet and dish data layer to Kakao Map or Naver Map.

Pricing has not been estimated yet; it needs usage data and interviews with a few restaurant owners.

## Validation and demo

**User validation**

- Survey 8 to 10 students, Korean and international, for example "Have you ever skipped a restaurant because you were unsure about the ingredients?"
- Record one headline number and two to three quotes for the slides.
- Talk to a few restaurant owners about a verified badge.

**Demo flow (about 3 minutes)**

1. Open the app on the map; show pins and how they change with the food profile.
2. Tap a restaurant; show dishes, 원산지 and an "ask first" dish.
3. Tap "Why?" to show the AI explanation and the Korean question.
4. Scan a real menu (Week 13).
5. If built: Co-op with two different profiles narrows the map to places that fit both.

## Risks and mitigation

| Risk | Mitigation |
| --- | --- |
| Scope too large | MVP list locked; login, reviews, friends and Co-op wait for Week 13 |
| Building starts after midterm, leaving little time before Week 11 | Install tools and finish one tutorial before midterm; build the map and data first |
| No one on the team has used React Native | Expo and JavaScript have the most tutorials; follow one tutorial together |
| Users over-trust a "safe" status | No guarantee claims, fixed disclaimer, "ask first" with staff question |
| Restaurant data is thin or outdated | Last-checked date, verification count, confidence level |
| AI misreads the menu | Show the original Korean next to the translation and let users correct it |
| Looks like another map app | Pitch as the layer Naver and Kakao lack: what can I eat |

## Decisions made

- Name: **Mukji**
- Platform: mobile app for iOS and Android with **React Native and Expo**
- The app opens on the map
- Badges cover everyone, including people who eat pork
- Reservation is contact only (call or copy the number)
- Favourites notes are private; public opinions go in reviews
- Login with Kakao and Google
- Co-op is a stretch goal for Week 13

## Open decisions

- Which revenue route to emphasize in the pitch
- Badge icon set: final logos for each badge
