#!/usr/bin/env bash
# Updates issues #1 to #14 to the new concept (map first, five tabs, badges for
# every diet) and creates #15 to #21. Run once, after create-issues.sh, inside
# the cloned repo. Needs the GitHub CLI (`gh auth login` first).
set -euo pipefail

M1="MVP complete (Week 11)"
M2="Execution package (Week 13)"
gh label create stretch --color BFD4F2 --description "Only if time allows" --force >/dev/null

body() { # owner, acceptance criteria
  printf '**Owner:** %s\n\n**Acceptance criteria**\n\n%s\n\nPrototype: https://claude.ai/artifact/Ruqs4wU1dTWFEm2D2ojS4z\n' "$1" "$2"
}
edit() { # number, title, owner, criteria
  gh issue edit "$1" --title "$2" --body "$(body "$3" "$4")" >/dev/null
  echo "updated #$1 $2"
}
new() { # title, label, milestone, owner, criteria
  gh issue create --title "$1" --label "$2" --milestone "$3" --body "$(body "$4" "$5")"
}

edit 1 "Map screen (opens first)" Irfan \
  "The app opens on a 2D map with a pin for every seeded restaurant; each pin shows its food-type logo and a badge count, and tapping it shows the restaurant preview."
edit 2 "Five bottom tabs" Aqil \
  "Home, Reserve, Search map (centre), Favourites and Profile switch screens, and the app opens on the Search map."
edit 3 "Restaurant data with 15 seeded restaurants" Adib \
  "At least 15 restaurants near ERICA, each with a location, phone number, badges, 원산지 and at least two dishes."
edit 4 "Food profile and filter" "Nik Ammar" \
  "Choosing halal, vegan or no pork outlines the pins that fit and fades the rest, and the Home list shows only fitting places."
edit 5 "Restaurant detail page" Adib \
  "Tapping a restaurant shows its badges, dishes marked safe, ask first or avoid with what to leave out, its 원산지, and a \"Do reservation\" button at the bottom."
edit 6 "Home suggestions nearby" Irfan \
  "Home lists restaurants within the profile's distance, filtered by profile, and tapping a food type filters the list."
edit 7 "Suggestion ranking" Irfan \
  "A restaurant with more recommendations and better reviews appears above one with fewer."
edit 8 "Trust badge and AI confidence level" Adib \
  "A restaurant shows a confidence level with its sources, and a dish shows its verification count and last-checked date, or \"not verified\"."
edit 9 "Korean order card" Aqil \
  "Tapping a dish opens a full-screen Korean sentence with the English meaning, with at least 3 phrases available."
edit 10 "AI explanation and Menu Scanner" "Nik Ammar" \
  "\"Why?\" on an ask-first dish shows a reason and its sources; a test menu photo returns dishes marked safe, ask first or avoid, each ask-first dish with a Korean question."
edit 11 "User survey" Irfan \
  "At least 8 people (Korean and international) answer, and one headline number plus two quotes are saved in the repository."
edit 12 "Demo script and pitch" Irfan \
  "A 3-minute script exists and the team has run the demo once from start to finish."
edit 13 "Bilingual UI (Korean and English)" Aqil \
  "Changing the language setting switches all screen text between Korean and English without restarting the app."
edit 14 "Allergy filter" Adib \
  "Selecting \"peanut\" removes every dish tagged with peanut and fades restaurants with no peanut-free dish."

new "Search page" frontend "$M1" Irfan \
  "Tapping the map search bar shows popular searches for the user's preferences and their 5 most recent searches."
new "Reserve tab and contact card" frontend "$M1" Aqil \
  "The Reserve tab lists restaurants; \"Do reservation\" shows the phone number with Call and Copy, the group-size note and a Korean sentence; History lists places contacted."
new "Favourites with private notes" frontend "$M2" Aqil \
  "Starring a restaurant adds it to Favourites with a private note; an empty list shows the empty state."
new "Profile, QR and friends" frontend "$M2" Adib \
  "Profile shows photo, name, QR code, settings, friend count and an invite link; scanning a friend's QR adds them."
new "Login with Kakao and Google" backend "$M2" "Nik Ammar" \
  "A user can sign in with Kakao or Google and stays signed in after restarting the app."
new "Public reviews with photos" backend "$M2" Adib \
  "A signed-in user posts stars, text, photos and their diet tag; other users see it on the restaurant page."
new "Co-op: eat together (stretch)" stretch "$M2" Irfan \
  "Picking two friends with different profiles leaves only the restaurants that fit all of them."

echo "Done."
