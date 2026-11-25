# Mukji (먹지)

A food map for everyone in Korea. Naver Map and Kakao Map tell you **where** a restaurant is. Mukji tells you **whether you can eat there, what to order, and how to ask for it in Korean**, based on your own food profile: halal, vegan, no pork, allergies, price, distance, or no restriction at all.

Course project for AI+X (Fall 2026). Launch area: around the ERICA campus.

## Status

Planning (Week 7). Screens are sketched and a clickable prototype exists; building starts after midterm.

- Clickable prototype: https://claude.ai/artifact/Ruqs4wU1dTWFEm2D2ojS4z
- Progress doc: https://claude.ai/code/artifact/41f7f9c0-54ec-4ffc-b940-4fe638a170af

## Idea in one minute

- **Map first.** The app opens on a 2D map; each restaurant pin shows a logo for its food type, and places that fit your profile stand out.
- **Badges for everyone.** "What they serve" (pork, beef, seafood, vegan options, alcohol) and "who it fits" (halal, halal-friendly, vegan, peanut-free).
- **Dish level.** Each dish is safe, ask first or avoid, with what to leave out.
- **AI explains.** "Why?" on a dish gives the reason from the menu, 원산지 label and reviews; the Menu Scanner reads paper menus.
- **Ordering help.** A Korean order card and a Korean sentence for phone reservations.
- **Reviews with diet tags.** Public reviews show the reviewer's diet and help correct the data.

## Docs

- [Team onboarding](docs/ONBOARDING.md): software to install, what to learn, how we use GitHub
- [Project proposal](docs/proposal.md)
- [Week 07 team activity worksheet](docs/week07-worksheet.md)
- [AI use log](PROMPTS.md)

## Tech stack

React Native with Expo, `react-native-maps`, Supabase (PostgreSQL and login), Kakao Local API for restaurant data. Details are in the Week 07 worksheet.

## Working agreement

- Work is tracked as GitHub Issues. Put the issue number in every commit, for example `#4 add food profile filter`.
- One branch per issue; merge through a pull request with `Closes #N`.
- Close an issue only when its acceptance criteria are met.
- Log any AI use in `PROMPTS.md`.
