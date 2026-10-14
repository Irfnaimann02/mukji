# Week 07 팀 활동지 / Team Activity

| 팀명 / Team | 작성일 / Date | 참여자 / Members |
| --- | --- | --- |
| Team 1, project: Mukji? | 2026-10-14 | (add members) |

## 1. 아키텍처 다이어그램 / Architecture Diagram

![architecture](architecture.jpg)

Add the hand-drawn photo as `docs/architecture.jpg`. Sketch three stacked boxes with arrows pointing downward only: Presentation → Logic → Data. Put the AI service as a small box beside Logic, connected only to Logic.

| 계층 / Layer | 모듈·파일 / Modules | 의존하지 않는 것 / Does not depend on |
| --- | --- | --- |
| 표현 / Presentation | MapScreen, RestaurantTab, NearbyTab, SettingsTab, DishDetailScreen, KoreanOrderCard, MenuScanScreen, ko/en language strings | Database or storage code, the AI service, and ranking or filtering rules |
| 로직 / Logic | DietFilter (match dishes to the diet profile), ConfidenceScorer (green / yellow / red), NearbyService (100 m filter), RecommendationRanker, MenuScannerService (calls the AI and flags ingredients), OrderPhraseBuilder | Screens, UI components and the UI framework |
| 데이터 / Data | RestaurantRepository, DishRepository, VerificationRepository, UserProfileStore, seed data files | Logic and Presentation (it only stores and returns data) |

Rule: a screen never reads the database directly; it asks a Logic module, and Logic asks a Repository. This lets the team change the database or the AI provider without touching the screens.

Module names are proposed; rename them to match the actual files.

### 기술 스택 / Tech Stack (proposed, pending team agreement)

The app is mobile and runs on both iOS and Android from one codebase.

| 계층 / Layer | 선택 / Choice | 이유 / Why |
| --- | --- | --- |
| 표현 / Presentation | React Native with Expo (TypeScript) | One codebase for iOS and Android; anyone can test on their own phone with Expo Go, with no Mac needed for iPhone |
| 지도 / Map | `react-native-maps` | Works inside Expo Go; the markers come from our own data |
| 카메라 / Camera | `expo-image-picker` | Menu photo for the scanner (#10) |
| 로직 / Logic | TypeScript modules in the app, plus an optional Python FastAPI service | Filtering and ranking can run in the app for the MVP; the AI call goes through a server so the API key never ships in the app |
| 데이터 / Data | Supabase (PostgreSQL) | Real SQL, a hosted API, and location queries for the 100 m filter (#6) |
| 데이터 수집 / Data seeding | Kakao Local API | Real restaurant names and coordinates around ERICA for #3 |

Not needed for the course: App Store or Play Store release. The demo runs from Expo Go.

## 2. 이슈 / Issues

Each issue is one piece of work with a test you can check. Put the number in commits (for example "#4 add diet profile filter") and close the issue when its criteria are met.

| # | 제목 / Title | 라벨 / Label | 담당 / Assignee | 완료 조건 / Acceptance Criteria |
| --- | --- | --- | --- | --- |
| #1 | Map home screen | frontend | | Opening the app shows a map with a marker for every seeded restaurant |
| #2 | Three bottom tabs | frontend | | Tapping Restaurant, Nearby and Settings switches screens and the map is still the first screen on launch |
| #3 | Restaurant and dish data with 15 seeded restaurants | data | | The data store holds at least 15 restaurants near ERICA, each with a location and at least one dish |
| #4 | Diet profile filter | backend | | Selecting "vegan" or "no pork" removes dishes containing the excluded ingredients from every restaurant's dish list |
| #5 | Dish page with modification rules | frontend | | Tapping a restaurant lists its dishes, and a dish with a rule such as "broth only" shows that rule |
| #6 | Nearby tab (100 m) | backend | | With a test location, only restaurants within 100 m appear and one at 150 m does not |
| #7 | Community-recommended ranking | backend | | A restaurant with more recommendations appears above one with fewer |
| #8 | Trust badge | backend | | A dish shows its verification count and last-checked date, and a dish with none shows "not verified" |
| #9 | Korean order card | frontend | | Tapping a dish opens a full-screen Korean sentence, with at least 3 phrases available |
| #10 | Menu Scanner prototype | ai | | A test menu photo returns dishes marked green, yellow or red, and each yellow dish shows a Korean question for staff |
| #11 | User survey | docs | | At least 8 people (Korean and international) answer, and one headline number plus two quotes are saved in the repository |
| #12 | Demo script and pitch | docs | | A 3-minute script exists and the team has run the demo once from start to finish |
| #13 | Bilingual UI (Korean and English) | frontend | | Changing the language setting switches all screen text between Korean and English without restarting the app |
| #14 | Allergy filter | backend | | Selecting "peanut" removes every dish tagged with peanut from the results |

## 3. 마일스톤 / Milestones

| 마일스톤 / Milestone | 마감 / Due | 포함 이슈 / Issues |
| --- | --- | --- |
| MVP 완료 | 11주차 / Week 11 | #1, #2, #3, #4, #5, #6, #7, #8, #9, #13, #14 |
| 실행 패키지 | 13주차 / Week 13 | #10, #11, #12 and any unfinished MVP issue |

AI를 사용했다면 PROMPTS.md에 기록 / Log any AI use in PROMPTS.md
