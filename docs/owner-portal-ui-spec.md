# MUKJI Owner Portal — UI Specification (OP-01 to OP-10)

**Status:** Proposed product specification  
**Scope:** Existing MUKJI mobile application (Expo / React Native)  
**Design reference:** Professional restaurant-partner workflows, without copying another platform's branding or interface.

## Design principles

- Keep the Owner Portal inside the existing MUKJI mobile application.
- Use a clean, light interface with MUKJI orange, white and black accents, consistent spacing, readable cards and clear status labels.
- Use Korean as the primary interface language and provide English support through the existing translation system.
- Break onboarding into short steps. Show progress and preserve incomplete work as a draft.
- Every screen must account for loading, empty, error and success states where applicable.
- Do not imply that a local draft has been submitted or that an owner-submitted halal claim has been verified.
- Collect only information needed for the stated onboarding purpose. Final document requirements must be confirmed separately before being treated as mandatory.
- Keep existing customer-facing screens and their data contracts out of this redesign.

## Shared onboarding behaviour

- Show a step indicator and the current step title.
- Provide Back and Continue actions, with validation before advancing.
- Preserve entered information when navigating between steps.
- Clearly distinguish **Save draft** from **Submit application**.
- Show a review summary before final submission.
- Do not publish a new restaurant or verified food-suitability claim merely because an applicant entered information.
- Keep the application status visible after submission.

---

## OP-01 — Owner Welcome

**Purpose:** Explain the restaurant-partner area and route users to the correct next action.

**Main content**
- MUKJI restaurant-partner identity.
- Short explanation that owners and authorized representatives can manage restaurant information.
- Primary action: **기존 계정 로그인 / Log in**.
- Secondary action: **새 매장 등록 / Register a restaurant**.
- Secondary action: **기존 매장 관리 신청 / Claim an existing restaurant**.
- Link back to the customer experience.

**Behaviour**
- Log in opens OP-02.
- Register opens OP-03.
- Claim opens the existing-restaurant selection path, then OP-03.
- Do not create a new Supabase account simply by opening this screen.

**States**
- Initial welcome state.
- Loading only when restoring a previous app mode.
- Recovery path back to the customer experience if mode restoration fails.

## OP-02 — Owner Login

**Purpose:** Authenticate an existing restaurant owner or authorized account.

**Main content**
- Email address.
- Email verification code after requesting a code.
- Send code / Verify code actions.
- Change email action while entering the code.
- Link back to customer mode.
- Development-only test-account sign-in remains hidden outside development builds.

**Behaviour**
- Validate email format before requesting a code.
- Validate the verification code before submitting it.
- Disable repeated actions while a request is running.
- Show a useful error when authentication fails.
- After successful authentication, enter the existing Owner Portal route.
- If the account is signed in but has no restaurant link, explain that access has not yet been assigned; do not silently grant restaurant access.
- Preserve the existing Supabase authentication and app-mode behaviour.

**States**
- Checking authentication.
- Email entry.
- Code sent / code entry.
- Signed-in account summary.
- Signed-in but not linked to a restaurant.
- Authentication error.
- Development test-account panel.

## OP-03 — Registration Type

**Purpose:** Identify the applicant's relationship to the business before collecting business information.

**Choices**
- **사업자 대표자 / Business owner**.
- **위임받은 관리자 / Authorized representative**.

**Main content**
- Short explanation of each choice.
- Continue action.
- Back action.

**Behaviour**
- Save the selected applicant type in the application draft.
- Use the choice to determine which authority information is requested later.
- An authorized representative must not automatically receive legal-owner privileges.
- Do not describe any document as legally mandatory until requirements have been verified.

**States**
- No choice selected.
- Choice selected.
- Validation message if the user tries to continue without choosing.

## OP-04 — Owner Account Registration

**Purpose:** Collect the account holder's contact and account information.

**Proposed fields**
- Full name.
- Mobile phone number.
- Email address.
- Account credential / authentication method.
- Phone verification state, if phone verification is implemented.
- Required terms and privacy agreement acknowledgements.

**Behaviour**
- Validate required fields and formats.
- Clearly show which contact channel has been verified.
- Avoid storing passwords in application drafts.
- Use the existing Supabase authentication approach unless a separately reviewed authentication change is approved.
- Save non-sensitive progress as a draft.

**States**
- Editing.
- Verification pending.
- Verification successful.
- Validation error.
- Authentication or network error.

## OP-05 — Business Information

**Purpose:** Record the legal business information associated with the applicant.

**Proposed fields**
- Business type: 개인사업자 / Individual business or 법인사업자 / Corporation.
- Business registration number (사업자등록번호).
- Registered business name (상호명).
- Legal representative's name.
- Business contact information.
- Registered business address.

**Behaviour**
- Validate field format and required values.
- Explain why each field is requested.
- For authorized representatives, distinguish the legal representative from the person managing the MUKJI account.
- Save progress as a draft.
- Do not claim that entering a registration number verifies the business.

**States**
- Editing.
- Invalid or incomplete information.
- Saved draft.
- Verification pending, if a verification service is later introduced.

## OP-06 — Document Upload

**Purpose:** Collect supporting evidence appropriate to the applicant and business.

**Potential document categories**
- 사업자등록증 — Business registration certificate.
- 영업신고증 — Restaurant business notification certificate.
- 위임장 — Authorization letter, when applicable.
- Halal certificates and related supporting evidence, when the restaurant makes a certification claim.
- Other supporting documents only when the review process requires them.

**Per-document information**
- Document category.
- Selected file name.
- Upload progress.
- Upload result.
- Review status.
- Expiry date, if applicable.
- Rejection reason or replacement request, when supplied by an administrator.

**Behaviour**
- Explain accepted file types and size limits once implementation constraints are confirmed.
- Use private storage with access controls.
- Do not expose document URLs publicly.
- Do not require every potential document from every applicant.
- Uploading a certificate does not itself create a verified halal claim.

**States**
- No document selected.
- File selected.
- Uploading.
- Uploaded / awaiting review.
- Upload failed.
- Replacement requested.
- Rejected.

## OP-07 — Restaurant Registration

**Purpose:** Collect information about a new restaurant branch.

**Proposed fields**
- Restaurant name in Korean.
- Restaurant name in English, if available.
- Restaurant category.
- Address.
- Map location / coordinates.
- Contact number.
- Opening hours.
- Closing days.
- Description.
- Restaurant photos.
- Facilities and services.

**Behaviour**
- Allow the applicant to review and correct the address and map pin.
- Treat each branch as an independent record with its own address, hours, contact details and photos.
- Do not assume that a new branch shares all details with another branch.
- Save as a draft until the application is submitted.
- Do not publish the restaurant before the review process is complete.

**States**
- Editing.
- Address or map location incomplete.
- Photo selection / upload.
- Saved draft.
- Validation error.

## OP-08 — Initial Menu Registration

**Purpose:** Let the applicant add initial menu information for the restaurant.

**Per-menu fields**
- Menu name in Korean.
- Menu name in English, if available.
- Price in KRW.
- Menu photo, if available.
- Ingredients known to be present.
- Ingredients that may be present / need confirmation.
- Ordering conditions and important notes.
- Food-suitability information supplied by the restaurant.

**Behaviour**
- Allow multiple menu items.
- Validate names and non-negative whole-number prices.
- Keep known ingredients separate from uncertain ingredients.
- Do not automatically mark a dish or restaurant as safe or halal-certified based only on owner input.
- Mark owner-submitted suitability information as awaiting review when review is required.
- Save menu progress as part of the application draft.

**States**
- No menu items.
- Menu item editing.
- Validation error.
- Saved draft.
- Suitability information awaiting review.

## OP-09 — Application Review

**Purpose:** Give the applicant a final chance to inspect the application before submission.

**Sections**
- Applicant type and account contact information.
- Business information.
- Uploaded documents and their upload states.
- Restaurant information.
- Initial menu items.
- Food-suitability claims and supporting evidence.

**Behaviour**
- Show missing or incomplete information clearly.
- Provide an Edit action for each section.
- Require an explicit final Submit action.
- Explain that submission sends the application for MUKJI review and does not guarantee approval.
- Prevent submission while required fields or required uploads for the chosen path are incomplete.

**States**
- Ready to submit.
- Missing information.
- Submission in progress.
- Submission successful.
- Submission failed.

## OP-10 — Application Status

**Purpose:** Show the current state of a submitted application and what the applicant should do next.

**Statuses**
- Draft.
- Submitted.
- Under review.
- Additional information required.
- Approved.
- Rejected.

**Main content**
- Current status and last-updated time.
- Short explanation of the status.
- Requested corrections or additional documents, if any.
- View application summary.
- Continue editing, when allowed.
- Contact / support guidance.

**Behaviour**
- Status must come from the application record, not be inferred from local draft state.
- Show additional-information requests and their reasons.
- An approved application may proceed to the existing Owner Portal or branch setup flow.
- A rejected application should show the review reason when available.
- Do not show an application as submitted until the backend confirms successful submission.

**States**
- Draft saved locally.
- Submitted.
- Under review.
- Additional information requested.
- Approved.
- Rejected.
- Status could not be loaded.

---

## PR9 — Post-login Owner Portal experience

The existing Owner Portal is organized as a professional workspace with a persistent left sidebar (navigation rail) and a main content area. The five destinations are Home, Restaurants, Menus, Reservations and More. On narrow mobile layouts, the rail may adapt to a compact navigation treatment while preserving the same destinations and information architecture. The visual reference is the approved MUKJI Owner Portal design board (Image 2), recoloured to use MUKJI orange, white and black rather than blue.

- **Home:** existing owner dashboard data, application activity, linked-restaurant summary and quick actions. Do not invent analytics or reservation totals that are not returned by the existing repositories.
- **Restaurants:** selected-restaurant context, restaurant profile, location, opening hours, facilities, photos and existing editing workflows.
- **Menus:** existing menu items, prices, availability, photos, ingredient details and ingredient-review submission workflows.
- **Reservations:** existing owner-wide booking list, refresh, customer-cancellation alerts and permitted owner responses, with client-side status filters.
- **More:** account information, help/support information, terms/policies information, switch to customer mode and sign out. Do not present future features as working destinations.

A restaurant selector remains visible above the content on every post-login tab. When an owner has multiple linked restaurants, it opens a selector; with one linked restaurant, it remains visible as context. Existing reservations continue to query the owner's linked restaurants according to the current repository contract.

Owners without an approved restaurant link remain in the existing application/onboarding path. They can complete business information, upload supporting documents and submit a new-restaurant or existing-restaurant claim application. The five-tab management shell is shown only when the account has an owner-linked restaurant (or when the development preview resolves its sample restaurant). Uploading documents or submitting an application does not itself grant access or verify a restaurant.

Shared visual tokens are defined in `mobile/src/constants/owner-portal-theme.ts`. The customer-facing portal is not part of this redesign and must retain its own appearance.

## Wider roadmap (not part of PR9)

The following remain future product ideas unless separately approved and implemented:

- OP-12 Business Selector beyond the current restaurant selector.
- OP-13 Full branch-management workflows.
- OP-17 Document Centre.
- OP-18 Team Management.
- OP-19 Employee Access Requests.
- OP-21 Change History.

## Data and security constraints

- The current `owners` relationship is the existing access-control source and must not be bypassed by client-side UI.
- A hidden button or disabled screen is not a security boundary; Supabase RLS must enforce access.
- The future business / branch / membership model must be designed against the live schema before adding migrations.
- Keep private documents in private storage with suitable policies.
- Preserve existing public restaurant records and customer-facing data during any migration.
- Record important changes and review decisions.
- Separate owner-submitted information, pending review information and administrator-verified information.

## Out of scope for this specification

- Customer-facing Search, Favourites, Reservations and restaurant discovery redesign.
- Legal conclusions about which Korean documents are mandatory.
- Automatic business identity verification without a confirmed service or review process.
- Automatic halal certification based on an owner declaration or uploaded document alone.
