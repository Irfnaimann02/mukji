import { supabase } from './supabase';

export type OwnerDashboardApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'needs_information'
  | 'approved'
  | 'rejected';

export type OwnerDashboardApplication = {
  id: string;
  businessName: string;
  restaurantName: string;
  kind: 'new' | 'claim' | 'business';
  status: OwnerDashboardApplicationStatus;
  reviewMessage: string;
  updatedAt: string;
  submittedAt: string | null;
};

export type OwnerDashboardData = {
  applications: OwnerDashboardApplication[];
  pendingReservationCount: number;
};

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

async function requireOwnerUser() {
  const sb = client();
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  if (!data.user || data.user.is_anonymous || !data.user.email_confirmed_at) {
    throw new Error('A verified partner account is required.');
  }
  return data.user;
}

function readStatus(value: unknown): OwnerDashboardApplicationStatus {
  switch (value) {
    case 'submitted':
    case 'under_review':
    case 'needs_information':
    case 'approved':
    case 'rejected':
      return value;
    default:
      return 'draft';
  }
}

/** Loads only the signed-in applicant's application records and their owned reservation requests. */
export async function loadOwnerDashboardData(restaurantIds: string[]): Promise<OwnerDashboardData> {
  const sb = client();
  const user = await requireOwnerUser();

  const [businessResult, restaurantApplicationResult, reservationResult] = await Promise.all([
    sb
      .from('owner_business_applications')
      .select('id,registered_business_name,status,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
    sb
      .from('owner_restaurant_applications')
      .select('id,business_application_id,application_type,restaurant_name_ko,existing_restaurant_id,status,review_message,submitted_at,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
    restaurantIds.length > 0
      ? sb
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .in('restaurant_id', restaurantIds)
          .eq('status', 'requested')
      : Promise.resolve({ data: null, error: null, count: 0 }),
  ]);

  if (businessResult.error) throw businessResult.error;
  if (restaurantApplicationResult.error) throw restaurantApplicationResult.error;
  if (reservationResult.error) throw reservationResult.error;

  const businessRows = businessResult.data ?? [];
  const restaurantRows = restaurantApplicationResult.data ?? [];
  const restaurantByBusinessId = new Map(
    restaurantRows.map((row) => [String(row.business_application_id), row]),
  );

  const applications: OwnerDashboardApplication[] = businessRows.map((business) => {
    const related = restaurantByBusinessId.get(String(business.id));
    return {
      id: String(related?.id ?? business.id),
      businessName: String(business.registered_business_name ?? ''),
      restaurantName: String(related?.restaurant_name_ko ?? ''),
      kind: related ? (related.application_type === 'claim' ? 'claim' : 'new') : 'business',
      status: readStatus(related?.status ?? business.status),
      reviewMessage: String(related?.review_message ?? ''),
      updatedAt: String(related?.updated_at ?? business.updated_at ?? ''),
      submittedAt: typeof related?.submitted_at === 'string' ? related.submitted_at : null,
    };
  });

  // Keep any restaurant application whose parent business row is not returned,
  // without exposing or guessing another user's data.
  const knownBusinessIds = new Set(businessRows.map((row) => String(row.id)));
  for (const row of restaurantRows) {
    if (knownBusinessIds.has(String(row.business_application_id))) continue;
    applications.push({
      id: String(row.id),
      businessName: '',
      restaurantName: String(row.restaurant_name_ko ?? ''),
      kind: row.application_type === 'claim' ? 'claim' : 'new',
      status: readStatus(row.status),
      reviewMessage: String(row.review_message ?? ''),
      updatedAt: String(row.updated_at ?? ''),
      submittedAt: typeof row.submitted_at === 'string' ? row.submitted_at : null,
    });
  }

  applications.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return {
    applications,
    pendingReservationCount: reservationResult.count ?? 0,
  };
}
