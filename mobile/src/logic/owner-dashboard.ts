import type { OwnerDashboardApplication, OwnerDashboardApplicationStatus } from '@/data/owner-dashboard-repository';

export type OwnerDashboardSummary = {
  pendingApplications: number;
  drafts: number;
  needsInformation: number;
  recentApplications: OwnerDashboardApplication[];
  attentionApplications: OwnerDashboardApplication[];
};

const PENDING_STATUSES: readonly OwnerDashboardApplicationStatus[] = [
  'submitted',
  'under_review',
  'needs_information',
];

export function summarizeOwnerDashboard(
  applications: OwnerDashboardApplication[],
): OwnerDashboardSummary {
  const sorted = [...applications].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const attentionApplications = sorted.filter((application) =>
    application.status === 'needs_information' || application.status === 'rejected',
  );

  return {
    pendingApplications: sorted.filter((application) => PENDING_STATUSES.includes(application.status)).length,
    drafts: sorted.filter((application) => application.status === 'draft').length,
    needsInformation: sorted.filter((application) => application.status === 'needs_information').length,
    recentApplications: sorted.slice(0, 5),
    attentionApplications,
  };
}
