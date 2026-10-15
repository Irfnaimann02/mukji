# Mukji team onboarding

Read this once before we start building. It covers what to install, what to learn early, and how we use GitHub.

Links:

- Repository: https://github.com/Irfnaimann02/mukji
- Clickable prototype of every screen: https://claude.ai/artifact/Ruqs4wU1dTWFEm2D2ojS4z
- Progress doc (status and owners): https://claude.ai/code/artifact/41f7f9c0-54ec-4ffc-b940-4fe638a170af

## 1. The project in one minute

Mukji is a food map for everyone in Korea. You set your food profile (halal, vegan, no pork, allergies, price, distance), and the map shows which restaurants fit you, which dishes you can eat, and how to ask for them in Korean. The app opens on a 2D map; each restaurant pin shows a logo for its food type. Details are in [proposal.md](proposal.md).

## 2. Software to install

Install these before midterm so we can start on day one after it. Everything is free.

| Software | Who | What it is for |
| --- | --- | --- |
| GitHub account, invite accepted | Everyone | Our code and task list live in the repository |
| Git | Everyone | Downloads the code and sends your changes (https://git-scm.com) |
| GitHub Desktop (optional) | Anyone new to Git | Buttons instead of Git commands (https://desktop.github.com) |
| VS Code | Everyone | Code editor (https://code.visualstudio.com); add the Prettier extension |
| Node.js, LTS version | Everyone | Runs Expo on your laptop (https://nodejs.org) |
| Expo Go app on your phone | Everyone | Runs our app on your own iPhone or Android phone, from the App Store or Play Store |
| Expo account | Everyone | Free account at https://expo.dev |
| Supabase account | Adib, then Nik Ammar | Database and login (https://supabase.com) |
| Kakao Developers account | Adib, Nik Ammar | Restaurant data (Kakao Local API) and Kakao login (https://developers.kakao.com) |
| Figma (optional) | Aqil | Turning the sketches into clean screen designs (https://figma.com) |

Later, in Week 12: an API key for the AI service (Nik Ammar). Never put API keys in the code or in GitHub.

## 3. What to learn early

Light work before midterm, about 3 to 4 hours in total. Do the shared part together if you can.

**Everyone**

1. Git basics, about 1 hour: clone, branch, commit, push, pull request. GitHub's own guide: https://docs.github.com/en/get-started/start-your-journey/hello-world
2. Expo tutorial, about 2 hours: build the small sample app in https://docs.expo.dev/tutorial/introduction/ and open it on your phone with Expo Go. If this works, you are ready.
3. Basic JavaScript, if you have not used it: variables, functions, arrays, objects. Expo's tutorial explains the rest as you go.

**By role, after midterm**

| Person | Learn first | Issues |
| --- | --- | --- |
| Irfan | `react-native-maps`: show pins from a list, custom pin images | #1, #6, #7, #15 |
| Adib | Supabase: create tables, insert rows, read them from the app | #3, #5, #8, #14 |
| Aqil | Expo Router tabs (bottom tabs), styling screens, Korean and English text | #2, #9, #13, #16, #17 |
| Nik Ammar | Supabase Auth with Kakao and Google, calling an AI API from a server | #4, #10, #19 |

## 4. How we use GitHub

**What an issue is.** An issue is one task on our to-do list, numbered #1, #2 and so on. Open the repository, click **Issues**, and you see all of them. Each issue has:

- a **title**: what to build
- **acceptance criteria**: the test that says it is done
- a **label**: frontend, backend, data, ai or docs
- a **milestone**: when it is due (MVP by Week 11, Execution package by Week 13)
- an **owner**: the one person who gets it to done; anyone can help

**How to work on an issue**

1. Pick your issue and make a branch for it, for example `4-food-profile-filter`.
2. Commit with the issue number in the message: `#4 add halal option to food profile`.
3. Push the branch and open a pull request. Write `Closes #4` in the description.
4. One teammate looks at it, then it is merged into `main`. The issue closes by itself.

Never push straight to `main`, and pull the latest `main` before you start new work.

**AI use.** Write every use of AI in [PROMPTS.md](../PROMPTS.md): the tool, what you asked, what you used, what you changed. The course requires it.

## 5. Timeline

| When | What |
| --- | --- |
| Now to midterm | Finish the sketches, give feedback on the prototype, install the software, do the Expo tutorial |
| After midterm, first week | Data (#3) and the map (#1) first, because most screens depend on them; tabs (#2) in parallel |
| Week 11 | MVP: map, tabs, data, food profile, restaurant page, Home, Search, Reserve, trust badge, order card, bilingual |
| Week 13 | AI explanation and scanner, login, favourites, profile and friends, reviews, survey, demo and pitch |
| If time allows | Co-op: eat together |
