import { describe, expect, it } from '@jest/globals';
import { summarizeOwnerDashboard } from '../owner-dashboard';
import type { OwnerDashboardApplication } from '@/data/owner-dashboard-repository';

const makeApplication = (
  id: string,
  status: OwnerDashboardApplication['status'],
  updatedAt: string,
): OwnerDashboardApplication => ({
  id,
  businessName: `Business ${id}`,
  restaurantName: `Restaurant ${id}`,
  kind: 'new',
  status,
  reviewMessage: '',
  updatedAt,
  submittedAt: null,
});

describe('owner dashboard summary', () => {
  it('counts submitted, under-review and needs-information applications as pending', () => {
    const summary = summarizeOwnerDashboard([
      makeApplication('1', 'submitted', '2026-01-01'),
      makeApplication('2', 'under_review', '2026-01-02'),
      makeApplication('3', 'needs_information', '2026-01-03'),
      makeApplication('4', 'approved', '2026-01-04'),
      makeApplication('5', 'rejected', '2026-01-05'),
    ]);

    expect(summary.pendingApplications).toBe(3);
    expect(summary.needsInformation).toBe(1);
  });

  it('counts drafts and orders the five most recent applications', () => {
    const applications = Array.from({ length: 7 }, (_, index) =>
      makeApplication(String(index), index < 2 ? 'draft' : 'approved', `2026-01-${String(index + 1).padStart(2, '0')}`),
    );
    const summary = summarizeOwnerDashboard(applications);

    expect(summary.drafts).toBe(2);
    expect(summary.recentApplications).toHaveLength(5);
    expect(summary.recentApplications[0].id).toBe('6');
    expect(summary.recentApplications[4].id).toBe('2');
  });

  it('flags applications that need applicant attention', () => {
    const summary = summarizeOwnerDashboard([
      makeApplication('1', 'needs_information', '2026-01-01'),
      makeApplication('2', 'rejected', '2026-01-02'),
      makeApplication('3', 'submitted', '2026-01-03'),
    ]);

    expect(summary.attentionApplications.map((application) => application.id)).toEqual(['2', '1']);
  });
});
