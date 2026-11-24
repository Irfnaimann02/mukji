# MUKJI Ethics and Data Presentation

- Do not present generic stock photos or AI-generated food images as photographs of a specific restaurant or menu item. Show restaurant- or dish-specific images only when they are supplied or approved by the restaurant and their relationship to the item is clear. If illustrative imagery is ever used, label it clearly as illustrative and keep it visually distinct from verified restaurant information.

## 6. Business onboarding and personal data

- Purpose limitation: applicant names and contact details, registered business details, addresses and supporting documents are collected only to prepare a restaurant-partner application and support later business verification. Do not reuse them for marketing or unrelated purposes.
- Access: business drafts, restaurant-application drafts and documents are private to the applicant. Applicants can read their own applications and edit only their own drafts. PR4 adds a submission state, but it does not add a staff review interface or grant staff access through the app. Do not describe a submitted application as under review, verified, approved or publicly listed unless a later authorized review workflow records that outcome.
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
