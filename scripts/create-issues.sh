#!/usr/bin/env bash
# Creates labels, milestones and the 14 Week 07 issues in the current repo.
# Run it once, inside the cloned repo, on a repo with no issues yet, so that
# the issue numbers match the worksheet (#1 to #14).
# Needs the GitHub CLI: https://cli.github.com  (run `gh auth login` first)
set -euo pipefail

M1="MVP complete (Week 11)"
M2="Execution package (Week 13)"

for l in frontend backend data ai docs; do
  gh label create "$l" --force >/dev/null
done

gh api repos/:owner/:repo/milestones -f title="$M1" >/dev/null
gh api repos/:owner/:repo/milestones -f title="$M2" >/dev/null

issue() { # title, label, milestone, acceptance criteria
  gh issue create --title "$1" --label "$2" --milestone "$3" \
    --body "**Acceptance criteria**"$'\n\n'"$4"
}

issue "Map home screen" frontend "$M1" \
  "Opening the app shows a map with a marker for every seeded restaurant."
issue "Three bottom tabs" frontend "$M1" \
  "Tapping Restaurant, Nearby and Settings switches screens and the map is still the first screen on launch."
issue "Restaurant and dish data with 15 seeded restaurants" data "$M1" \
  "The data store holds at least 15 restaurants near ERICA, each with a location and at least one dish."
issue "Diet profile filter" backend "$M1" \
  "Selecting \"vegan\" or \"no pork\" removes dishes containing the excluded ingredients from every restaurant's dish list."
issue "Dish page with modification rules" frontend "$M1" \
  "Tapping a restaurant lists its dishes, and a dish with a rule such as \"broth only\" shows that rule."
issue "Nearby tab (100 m)" backend "$M1" \
  "With a test location, only restaurants within 100 m appear and one at 150 m does not."
issue "Community-recommended ranking" backend "$M1" \
  "A restaurant with more recommendations appears above one with fewer."
issue "Trust badge" backend "$M1" \
  "A dish shows its verification count and last-checked date, and a dish with none shows \"not verified\"."
issue "Korean order card" frontend "$M1" \
  "Tapping a dish opens a full-screen Korean sentence, with at least 3 phrases available."
issue "Menu Scanner prototype" ai "$M2" \
  "A test menu photo returns dishes marked green, yellow or red, and each yellow dish shows a Korean question for staff."
issue "User survey" docs "$M2" \
  "At least 8 people (Korean and international) answer, and one headline number plus two quotes are saved in the repository."
issue "Demo script and pitch" docs "$M2" \
  "A 3-minute script exists and the team has run the demo once from start to finish."
issue "Bilingual UI (Korean and English)" frontend "$M1" \
  "Changing the language setting switches all screen text between Korean and English without restarting the app."
issue "Allergy filter" backend "$M1" \
  "Selecting \"peanut\" removes every dish tagged with peanut from the results."

echo "Done. Assign owners in GitHub Issues."
