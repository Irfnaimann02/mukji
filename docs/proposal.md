# Mukji? — AI+X Project Proposal

## Summary

Mukji? is a diet-aware food layer for everyone in Korea, Korean and international alike. Naver Map and Kakao Map tell you where a restaurant is; Mukji? tells you **what you can actually eat there and how to order it**, based on your own diet (vegan, vegetarian, halal-friendly, no pork, allergies).

It works at the **dish level**, not the restaurant level. Each dish carries a confidence status (safe, ask first, avoid) and ordering tips such as "no meat, broth only". An AI Menu Scanner reads a photo of a menu and flags problem ingredients, while community data from Korean and international users verifies the results.

Launch area: the ERICA campus surroundings, with 15 to 20 verified restaurants. The vision is wider, but the demo stays focused on one area.

Working name: **Mukji?** (먹지, "eat?").

## Problem

People with dietary needs struggle to know what is safe to eat because the information is missing at the moment they decide.

- **Map apps list places, not diets.** Naver Map and Kakao Map show where restaurants are, but not which dishes fit a vegan, halal-friendly or allergy-safe diet.
- **Menus are in Korean.** Foreign users cannot read or translate ingredients accurately.
- **Hidden ingredients.** Broths, sauces and stocks often contain meat or allergens that the menu does not mention.
- **Restaurant-level information is too coarse.** A restaurant may be unsuitable overall, yet have one or two dishes that work with a small modification.
- **Wrong choices are costly.** People arrive, discover there is nothing suitable, and lose time and money.

Our assumption is that people tend to stay with a few familiar places; user interviews will test this.

## Target users

The halal-only market in Korea is small, so Mukji? serves anyone who filters food by diet, whether they are Korean or international.

| Group | Main need |
| --- | --- |
| Vegan and vegetarian people (Korean and international) | No meat, fish or eggs, depending on the diet |
| People with allergies | Avoid ingredients such as nuts, seafood or gluten |
| Muslim and halal-friendly eaters | Halal or halal-friendly choices, no pork or alcohol |
| International students, exchange students and tourists | No Korean, need fast translation |
| Korean friends and classmates who eat with them | Find places that work for the whole group |

The first users are around the ERICA campus. Korean users also help the product, because they can read menus and verify dishes. The real market size still has to be confirmed through a survey.

## Solution

Mukji? answers one question: **"What can I eat here, and how do I order it?"**

Four core ideas:

1. **Map first.** The app opens on a map of the campus and surroundings, with restaurant markers.
2. **Dishes, not just restaurants.** Tap a restaurant to see the dishes that fit your diet profile, including specific rules such as "remove the meat" or "broth only".
3. **Korean order card.** One tap shows a large Korean sentence to show the staff, for example asking to remove meat or asking whether the broth contains meat.
4. **Bilingual by design.** The whole app works in Korean and English, so Korean and international friends can use it together.

## Features and scope

Scope is split into an MVP that must be ready for the demo and bonus items if time allows.

| Feature | Description | Level |
| --- | --- | --- |
| Map view | Map as the home screen with restaurant markers | MVP |
| Three bottom tabs | Restaurant, Nearby, Settings | MVP |
| Restaurant tab | Most community-recommended restaurants at the top | MVP |
| Nearby tab | Restaurants within 100 m of the user | MVP |
| Dish page | What can be eaten and modification rules per restaurant | MVP |
| Diet profile | Vegan, vegetarian, halal-friendly, no pork, allergies | MVP |
| Bilingual UI | Korean and English throughout | MVP |
| Korean order card | Large Korean sentence to show staff | MVP |
| Trust badge | Number of verifications and last-checked date | MVP |
| AI Menu Scanner | Scan a menu photo, flag ingredients and allergens, suggest modifications | Wow feature (limited demo) |
| After-meal feedback | One tap "correct / incorrect" | Bonus |
| Dish contributions | Any user adds or corrects a dish | Bonus |
| Restaurant dashboard | Restaurants see visits and update their menu | Bonus |

## AI role: Menu Scanner

AI is used for one clear job: **reading the menu and helping the user decide, not acting as a halal authority.**

1. The user takes a photo of the menu at the restaurant.
2. AI extracts the Korean text, translates the dish names and identifies the ingredients that are written.
3. Each dish is compared with the user's diet profile and given a confidence level.
4. For dishes that need checking, the app generates a Korean question to ask the staff.

| Level | Meaning | App action |
| --- | --- | --- |
| Green | No problem ingredient written on the menu | Suggest, with a general reminder |
| Yellow | May fit, but depends on broth, sauce or stock | Show the Korean question to confirm |
| Red | Clear meat, pork or alcohol | Avoid, offer a modification if one exists |

**Acknowledged limit:** AI only sees what is written. Ingredients not named on the menu cannot be detected, which is why green never means "guaranteed".

**Where menu data comes from.** The scanner does not depend on restaurants publishing menus online, and the app does not scrape Naver Map or Kakao Map.

- **On-site photo.** The user photographs the physical menu, board or kiosk screen, so the scanner works wherever the menu exists in front of them.
- **Team-collected data.** For the demo restaurants, the team photographs the menus and enters verified dishes ahead of time.
- **Community contributions.** Users can add or correct dishes after a visit, which grows the database over time.
- **No menu available.** The restaurant is marked "not verified" and shows only community notes, never a scanner result.

## Trust system

The app is only useful if users trust it, so honesty about uncertainty is a core feature, not a weakness.

- **Community-based, not certified.** No "certified halal" or "guaranteed" claims. The app states that information comes from menus and community experience.
- **Verification badge.** Each dish shows how many people verified it and when it was last checked. Restaurants with no data are marked "not verified".
- **Ask the staff as the final step.** A yellow status always comes with a Korean question.
- **Learning loop.** After eating, the user taps "correct" or "incorrect", and that data updates the trust badge.
- **Fixed disclaimer.** "Based on the menu and community information. Please confirm with the restaurant."

## Differentiation

Mukji? does not replace Naver Map or Kakao Map. It adds the layer they lack: what you can eat, not just where to go. Other teams will likely build a restaurant list with diet filters, so Mukji? differs on points that are hard to copy in a short time.

| Aspect | Map apps and typical diet-filter apps | Mukji? |
| --- | --- | --- |
| Core question | Where is the restaurant? | What can I eat there, and how do I order it? |
| Unit of information | Restaurant (yes/no) | Dish and how to modify it |
| Help at the restaurant | None | Korean order card and staff questions |
| Data honesty | A single badge | Confidence level with verification count and date |
| Language | Mostly one language | Korean and English together |
| AI | Usually none, or plain search | Menu Scanner with acknowledged limits |

## Revenue model

Four routes are proposed, ordered by feasibility.

1. **"Verified Friendly" listing for restaurants.** Restaurants pay for a dashboard, a verified badge and promotion to diet-conscious customers.
2. **Vegan, vegetarian and health-focused cafes.** A larger paying group than halal alone, since they want to reach customers who filter by diet.
3. **Partnership with university international offices.** The app is offered as a support tool for exchange and new students.
4. **Coupons and campus-area partners.** Location-based discounts or promotions within 100 m.

Pricing and projections have not been estimated yet. They need real usage data and interviews with a few restaurant owners.

## Validation and demo

Judges look for a clear problem, evidence and a working demo, so all three should be prepared early.

**User validation**

- Survey 8 to 10 students, both Korean and international, with a few short questions, for example "Have you ever skipped a meal because you were unsure about the ingredients?"
- Record one headline number and two to three quotes for the slides.
- Talk to a few restaurant owners about their interest in a verified badge.

**Demo data**

- Collect and verify about 15 to 20 real restaurants near ERICA before the demo.
- Prepare 3 to 5 real menu photos to demo the Menu Scanner.

**Demo flow (about 3 minutes)**

1. Open the map and show restaurants within 100 m.
2. Pick a restaurant and show its dishes and modification rules.
3. Scan a real menu and show green, yellow and red results.
4. On a yellow result, open the Korean order card.

A demo that deliberately includes one yellow case is more convincing than one that is all green, because it shows the app is honest about the limits of the technology.

## Risks and mitigation

The biggest risk is scope that is too wide and a half-finished demo, not an idea that overlaps with another team.

| Risk | Mitigation |
| --- | --- |
| Scope too large | Lock the MVP list; demo the Menu Scanner with 3 to 5 menus only |
| A wider audience needs more data | Launch around ERICA with 15 to 20 verified restaurants; present the wider reach as the vision |
| Looks like another map app | Pitch as a layer on top of Naver and Kakao that answers "what can I eat" |
| Users over-trust a "safe" status | No guarantee claims, fixed disclaimer, yellow level with staff question |
| Restaurant data is thin or outdated | Show the last-checked date and the verification count |
| AI misreads the menu or translation | Show the original Korean next to the translation and let users correct it |
| Menus not available online | Scan on-site photos and use team-collected data; never depend on map platforms |
| Idea overlaps with another team | Focus on the differentiators: dishes, Korean order card and honest data |

## Work plan

Phases are ordered by priority.

1. **Lock scope.** Agree the MVP list and one wow feature (Menu Scanner or order card).
2. **Collect data.** List and verify restaurants and dishes around ERICA; run the survey.
3. **Build the core.** Map, three tabs, dish pages, diet profile and trust badge.
4. **Build the wow feature.** Menu Scanner and Korean order card, tested with real menus.
5. **Polish and test.** Test with a few users and fix the main issues.
6. **Prepare the pitch.** Slides, a 3-minute demo script and a backup in case the connection fails.

## Open decisions

- Main wow feature: Menu Scanner or Korean order card?
- Final app name (Mukji?, BolehMakan, Bapsang, or another)
- Which revenue route to emphasize
- Tech stack: React Native with Expo (proposed) or Flutter, depending on what the team already knows
