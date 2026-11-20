# MUKJI Ethics and Data Presentation

- Do not present generic stock photos or AI-generated food images as photographs of a specific restaurant or menu item. Show restaurant- or dish-specific images only when they are supplied or approved by the restaurant and their relationship to the item is clear. If illustrative imagery is ever used, label it clearly as illustrative and keep it visually distinct from verified restaurant information.

## 6. Business onboarding and personal data

- Purpose limitation: applicant names and contact details, registered business details, addresses and supporting documents are collected only to prepare a restaurant-partner application and support later business verification. Do not reuse them for marketing or unrelated purposes.
- Access: PR3 stores drafts and documents privately. Applicants can access their own records; MUKJI staff review access is not enabled in this stage. Do not describe a draft as reviewed, verified or submitted.
- Notice and acknowledgement: show the collection purpose and actual retention behaviour before saving or uploading, and record the applicant's affirmative acknowledgement timestamp on the draft.
- Applicant control: before submission, an applicant can delete their draft. Deleting a draft must also remove its private Storage objects and document metadata.
- Retention: the current implementation keeps a draft until the applicant deletes it; no automatic expiry is configured. This is an explicit interim retention rule, not a claim that indefinite retention is appropriate. The team must approve a time-limited retention schedule and implement expiry before collecting production applicants or enabling submission.
- Data minimisation: request only documents needed for the applicant's situation. Do not request bank-account copies or unrelated identity/financial documents. Restrict access through Supabase RLS and private Storage policies; UI hiding is not an access-control mechanism.
- Legal review: this project note records the intended handling but is not a privacy-policy notice or legal opinion. The team must review the final collection notice, retention schedule, deletion process and lawful basis with the responsible university/project privacy contact before production use.
