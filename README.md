# Mukji? (먹지?)

A diet-aware food layer for everyone in Korea. Naver Map and Kakao Map tell you **where** a restaurant is. Mukji? tells you **what you can actually eat there and how to order it**, based on your diet: vegan, vegetarian, halal-friendly, no pork, allergies.

Course project for AI+X (Fall 2026). Launch area: around the ERICA campus.

## Status

Planning (Week 7). Nothing is built yet. See the issue list and milestones for the plan.

## Idea in one minute

- **Dish level, not restaurant level.** Each dish has a confidence status: safe, ask first, or avoid.
- **Ordering help.** A Korean order card you can show to staff, for example "no meat, broth only".
- **AI Menu Scanner.** Photograph a menu, and AI flags ingredients that clash with your diet. It only reads what is written, so it never claims a dish is guaranteed.
- **Community verification.** Each dish shows how many people verified it and when.
- **Bilingual.** Korean and English throughout.

## Docs

- [Project proposal](docs/proposal.md)
- [Week 07 team activity worksheet](docs/week07-worksheet.md)
- [AI use log](PROMPTS.md)

## Architecture (planned)

Three layers, with dependencies pointing downward only: Presentation → Logic → Data. Details are in the Week 07 worksheet.

## Working agreement

- Work is tracked as GitHub Issues. Put the issue number in every commit, for example `#4 add diet profile filter`.
- Close an issue only when its acceptance criteria are met.
- Log any AI use in `PROMPTS.md`.
