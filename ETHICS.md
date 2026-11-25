# MUKJI Ethics and Data Presentation

- Do not present generic stock photos or AI-generated food images as photographs of a specific restaurant or menu item. Show restaurant- or dish-specific images only when they are supplied or approved by the restaurant and their relationship to the item is clear. If illustrative imagery is ever used, label it clearly as illustrative and keep it visually distinct from verified restaurant information.

## 6. Business onboarding and personal data

- Purpose limitation: applicant names and contact details, registered business details, addresses and supporting documents are collected only to prepare a restaurant-partner application and support later business verification. Do not reuse them for marketing or unrelated purposes.
- Access: business drafts, restaurant-application drafts and documents are private to the applicant. Applicants can read their own applications and edit only their own drafts. PR4 adds a submission state. Since #118 (SQL 043), the four Mukji team members (`team_members`) can read submitted applications and their documents to approve or reject them; nobody else can (see section 8). Do not describe a submitted application as under review, verified, approved or publicly listed unless that review records the outcome.
- Notice and acknowledgement: show the collection purpose and actual retention behaviour before saving or uploading, and record the applicant's affirmative acknowledgement timestamp and notice version on the business draft. Require renewed acknowledgement when the notice version changes.
- Applicant control: before submission, an applicant can delete their business draft and its private Storage objects and document metadata. A submitted restaurant application is locked and cannot be deleted by the applicant in this release.
- Retention: business drafts remain until the applicant deletes them; no automatic expiry is configured. Submitted restaurant applications also remain stored because a time-limited retention and applicant deletion workflow has not yet been implemented. This is an explicit interim development limitation, not a claim that indefinite retention is appropriate. The team must approve and implement a time-limited retention schedule before collecting production applicants.
- Data minimisation: request only documents needed for the applicant's situation. Do not request bank-account copies or unrelated identity/financial documents. Restrict access through Supabase RLS and private Storage policies; UI hiding is not an access-control mechanism.
- Legal review: this project note records the intended handling but is not a privacy-policy notice or legal opinion. The team must review the final collection notice, retention schedule, deletion process and lawful basis with the responsible university/project privacy contact before production use.

## 7. Generated typical menus (#103)

- Restaurants with no real or official chain menu may show a generated "typical menu" for their licence category (e.g. 중국식, 분식). It is a guess about what such a place usually serves, not this restaurant's menu.
- Every such menu shows a banner saying so. No typical dish is ever marked Safe for a user with a diet or allergy; the best it can show is Ask first, and a tag that matches still shows Avoid.
- No prices are invented: typical dishes are stored with price 0, which the app hides.
- Real data always wins: when an owner, the team or a menu scan adds a real dish, the database removes that restaurant's typical dishes automatically. The whole set can be removed with `delete from public.dishes where typical;`.
- Categories too vague to guess (기타, 뷔페식, 외국음식전문점 and similar) are left empty.

## 8. Owner approval and team owner access (#118)

- Who sees applications: only the four people in `team_members`, through a team-only screen (Profile → Owner tools). They see the submitted business details, including the business registration number, and can open the uploaded documents through 10-minute links. The documents bucket stays private; the team can only read, never change or delete, an applicant's files.
- Why: to check that the applicant really runs the restaurant before giving them control of its menu, information and bookings. The details are not copied anywhere else, shown in the app to anyone else, or used for anything but this check.
- Decisions: approve makes the applicant the restaurant's owner. Reject needs a written reason, which the applicant sees. Each decision records who made it and when. A "new restaurant" application is only approved when the team can link it to an existing listing; otherwise it is rejected with a message, so no restaurant appears on the map without a known position.
- Team "open as owner": a team member can open any restaurant's Owner Portal to test it or answer bookings. These links are marked `via_team` and kept separate from real owners; closing one never removes a real owner. Confirming a booking tells the customer the restaurant agreed, so the team only confirms bookings when the restaurant actually did (for example, our own test bookings, or after phoning the restaurant). Remove all team links with `delete from public.owners where via_team;`.

