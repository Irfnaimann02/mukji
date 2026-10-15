# Week 07 팀 활동지 / Team Activity

| 팀명 / Team | 작성일 / Date | 참여자 / Members |
| --- | --- | --- |
| Team 1, project: Mukji | 2026-10-15 | Irfan, Adib, Aqil, Nik Ammar |

## 1. 아키텍처 다이어그램 / Architecture Diagram

![architecture](architecture.jpg)

Add the hand-drawn photo as `docs/architecture.jpg`. Sketch three stacked boxes with arrows pointing downward only: Presentation → Logic → Data. Put the AI service as a small box beside Logic, connected only to Logic.

Screen sketches: see the clickable prototype at https://claude.ai/artifact/Ruqs4wU1dTWFEm2D2ojS4z.

| 계층 / Layer | 모듈·파일 / Modules | 의존하지 않는 것 / Does not depend on |
| --- | --- | --- |
| 표현 / Presentation | MapScreen (opens first), SearchScreen, HomeScreen, ReserveScreen, FavouritesScreen, ProfileScreen, RestaurantDetailScreen, ContactSheet, KoreanOrderCard, MenuScanScreen, FoodProfileScreen, ko/en language strings | Database or storage code, the AI service, and filtering or ranking rules |
| 로직 / Logic | ProfileFilter (which restaurants and dishes fit a food profile), BadgeService (works out "who it fits" from "what they serve"), ConfidenceScorer (safe / ask first / avoid and confidence level), NearbyService (distance filter), SuggestionRanker, AIExplainer and MenuScannerService (call the AI), OrderPhraseBuilder | Screens, UI components and the UI framework |
| 데이터 / Data | RestaurantRepository, DishRepository, ReviewRepository, UserProfileStore, FavouritesStore, SearchHistoryStore, seed data files | Logic and Presentation (it only stores and returns data) |

Rule: a screen never reads the database directly; it asks a Logic module, and Logic asks a Repository. This lets the team change the database or the AI provider without touching the screens.

Module names are proposed; rename them to match the actual files.

### 기술 스택 / Tech Stack (decided)

The app is mobile and runs on both iOS and Android from one codebase. No one on the team has used a mobile framework yet, so we chose the one with the most tutorials and the easiest phone testing.

| 계층 / Layer | 선택 / Choice | 이유 / Why |
| --- | --- | --- |
| 표현 / Presentation | React Native with Expo (JavaScript or TypeScript) | One codebase for iOS and Android; test on your own phone with Expo Go, no Mac needed for iPhone |
| 지도 / Map | `react-native-maps` | Works inside Expo Go; the pins come from our own data |
| 카메라 / Camera | `expo-image-picker` | Menu photo for the scanner (#10) |
| 로직 / Logic | JavaScript modules in the app, plus an optional Python FastAPI service | Filtering can run in the app; the AI call goes through a server so the API key never ships in the app |
| 데이터 / Data | Supabase (PostgreSQL) | Real SQL, a hosted API, login (Kakao, Google) and location queries |
| 데이터 수집 / Data seeding | Kakao Local API | Real restaurant names, phone numbers and coordinates around ERICA (#3) |

Not needed for the course: App Store or Play Store release. The demo runs from Expo Go.

## 2. 이슈 / Issues

Each issue is one piece of work with a test you can check. Each issue has one owner who gets it to done; anyone can help or review. Put the number in commits (for example "#4 add food profile filter") and close the issue when its criteria are met.

| # | 제목 / Title | 라벨 / Label | 담당 / Assignee | 완료 조건 / Acceptance Criteria |
| --- | --- | --- | --- | --- |
| #1 | Map screen (opens first) | frontend | Irfan | The app opens on a 2D map with a pin for every seeded restaurant; each pin shows its food-type logo and a badge count, and tapping it shows the restaurant preview |
| #2 | Five bottom tabs | frontend | Aqil | Home, Reserve, Search map (centre), Favourites and Profile switch screens, and the app opens on the Search map |
| #3 | Restaurant data with 15 seeded restaurants | data | Adib | At least 15 restaurants near ERICA, each with a location, phone number, badges, 원산지 and at least two dishes |
| #4 | Food profile and filter | backend | Nik Ammar | Choosing halal, vegan or no pork outlines the pins that fit and fades the rest, and the Home list shows only fitting places |
| #5 | Restaurant detail page | frontend | Adib | Tapping a restaurant shows its badges, dishes marked safe, ask first or avoid with what to leave out, its 원산지, and a "Do reservation" button at the bottom |
| #6 | Home suggestions nearby | backend | Irfan | Home lists restaurants within the profile's distance, filtered by profile, and tapping a food type filters the list |
| #7 | Suggestion ranking | backend | Irfan | A restaurant with more recommendations and better reviews appears above one with fewer |
| #8 | Trust badge and AI confidence level | backend | Adib | A restaurant shows a confidence level with its sources, and a dish shows its verification count and last-checked date, or "not verified" |
| #9 | Korean order card | frontend | Aqil | Tapping a dish opens a full-screen Korean sentence with the English meaning, with at least 3 phrases available |
| #10 | AI explanation and Menu Scanner | ai | Nik Ammar | "Why?" on an ask-first dish shows a reason and its sources; a test menu photo returns dishes marked safe, ask first or avoid, each ask-first dish with a Korean question |
| #11 | User survey | docs | Irfan | At least 8 people (Korean and international) answer, and one headline number plus two quotes are saved in the repository |
| #12 | Demo script and pitch | docs | Irfan | A 3-minute script exists and the team has run the demo once from start to finish |
| #13 | Bilingual UI (Korean and English) | frontend | Aqil | Changing the language setting switches all screen text between Korean and English without restarting the app |
| #14 | Allergy filter | backend | Adib | Selecting "peanut" removes every dish tagged with peanut and fades restaurants with no peanut-free dish |
| #15 | Search page | frontend | Irfan | Tapping the map search bar shows popular searches for the user's preferences and their 5 most recent searches |
| #16 | Reserve tab and contact card | frontend | Aqil | The Reserve tab lists restaurants; "Do reservation" shows the phone number with Call and Copy, the group-size note and a Korean sentence; History lists places contacted |
| #17 | Favourites with private notes | frontend | Aqil | Starring a restaurant adds it to Favourites with a private note; an empty list shows the empty state |
| #18 | Profile, QR and friends | frontend | Adib | Profile shows photo, name, QR code, settings, friend count and an invite link; scanning a friend's QR adds them |
| #19 | Login with Kakao and Google | backend | Nik Ammar | A user can sign in with Kakao or Google and stays signed in after restarting the app |
| #20 | Public reviews with photos | backend | Adib | A signed-in user posts stars, text, photos and their diet tag; other users see it on the restaurant page |
| #21 | Co-op: eat together (stretch) | backend | Irfan | Picking two friends with different profiles leaves only the restaurants that fit all of them |

## 3. 마일스톤 / Milestones

| 마일스톤 / Milestone | 마감 / Due | 포함 이슈 / Issues |
| --- | --- | --- |
| MVP 완료 | 11주차 / Week 11 | #1 to #9, #13 to #16 |
| 실행 패키지 | 13주차 / Week 13 | #10, #11, #12, #17 to #20 and any unfinished MVP issue |
| Stretch | If time allows | #21 |

AI를 사용했다면 PROMPTS.md에 기록 / Log any AI use in PROMPTS.md
