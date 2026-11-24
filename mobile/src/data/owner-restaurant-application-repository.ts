import { supabase } from './supabase';

export type OwnerRestaurantApplicationKind = 'new' | 'claim';
export type OwnerRestaurantApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'needs_information'
  | 'approved'
  | 'rejected';

export type OwnerRestaurantApplicationInput = {
  kind: OwnerRestaurantApplicationKind;
  existingRestaurantId: string;
  restaurantNameKo: string;
  restaurantNameEn: string;
  category: string;
  address: string;
  phone: string;
  description: string;
};

export type OwnerRestaurantApplication = OwnerRestaurantApplicationInput & {
  id: string;
  businessApplicationId: string;
  status: OwnerRestaurantApplicationStatus;
  reviewMessage: string;
  submittedAt: string | null;
  updatedAt: string;
};

export type ClaimableRestaurant = {
  id: string;
  nameKo: string;
  nameEn: string;
  address: string;
  phone: string;
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

function fromRow(row: Record<string, unknown>): OwnerRestaurantApplication {
  return {
    id: String(row.id),
    businessApplicationId: String(row.business_application_id),
    kind: row.application_type === 'claim' ? 'claim' : 'new',
    existingRestaurantId: String(row.existing_restaurant_id ?? ''),
    restaurantNameKo: String(row.restaurant_name_ko ?? ''),
    restaurantNameEn: String(row.restaurant_name_en ?? ''),
    category: String(row.category ?? ''),
    address: String(row.address ?? ''),
    phone: String(row.phone ?? ''),
    description: String(row.description ?? ''),
    status: row.status as OwnerRestaurantApplicationStatus,
    reviewMessage: String(row.review_message ?? ''),
    submittedAt: typeof row.submitted_at === 'string' ? row.submitted_at : null,
    updatedAt: String(row.updated_at ?? ''),
  };
}

function toPayload(input: OwnerRestaurantApplicationInput) {
  return {
    application_type: input.kind,
    existing_restaurant_id: input.kind === 'claim' ? input.existingRestaurantId || null : null,
    restaurant_name_ko: input.kind === 'new' ? input.restaurantNameKo.trim() : null,
    restaurant_name_en: input.kind === 'new' ? input.restaurantNameEn.trim() : null,
    category: input.kind === 'new' ? input.category.trim() : null,
    address: input.kind === 'new' ? input.address.trim() : null,
    phone: input.kind === 'new' ? input.phone.trim() : null,
    description: input.kind === 'new' ? input.description.trim() : null,
    updated_at: new Date().toISOString(),
  };
}

export async function loadOwnerRestaurantApplication(
  businessApplicationId: string,
): Promise<OwnerRestaurantApplication | null> {
  const sb = client();
  const user = await requireOwnerUser();
  const { data, error } = await sb
    .from('owner_restaurant_applications')
    .select('*')
    .eq('business_application_id', businessApplicationId)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as unknown as Record<string, unknown>) : null;
}

export async function saveOwnerRestaurantApplication(
  businessApplicationId: string,
  input: OwnerRestaurantApplicationInput,
  existingId: string | null,
): Promise<OwnerRestaurantApplication> {
  const sb = client();
  const user = await requireOwnerUser();
  const payload = toPayload(input);

  if (existingId) {
    const { data, error } = await sb
      .from('owner_restaurant_applications')
      .update(payload)
      .eq('id', existingId)
      .eq('business_application_id', businessApplicationId)
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('The restaurant application was not found or is no longer editable.');
    return fromRow(data as unknown as Record<string, unknown>);
  }

  const { data, error } = await sb
    .from('owner_restaurant_applications')
    .insert({
      user_id: user.id,
      business_application_id: businessApplicationId,
      ...payload,
    })
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data as unknown as Record<string, unknown>);
}

export async function submitOwnerRestaurantApplication(applicationId: string): Promise<void> {
  const sb = client();
  await requireOwnerUser();
  const { error } = await sb.rpc('submit_owner_restaurant_application', {
    p_application_id: applicationId,
  });
  if (error) throw error;
}

export async function getClaimableRestaurant(id: string): Promise<ClaimableRestaurant | null> {
  const sb = client();
  await requireOwnerUser();
  const { data, error } = await sb
    .from('restaurants')
    .select('id,name_ko,name_en,address,phone')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: String(data.id),
    nameKo: String(data.name_ko ?? ''),
    nameEn: String(data.name_en ?? ''),
    address: String(data.address ?? ''),
    phone: String(data.phone ?? ''),
  };
}

export async function searchClaimableRestaurants(query: string): Promise<ClaimableRestaurant[]> {
  const sb = client();
  await requireOwnerUser();
  const term = query.trim().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
  if (term.length < 2) return [];
  const pattern = `%${term}%`;
  const [ko, en, address] = await Promise.all([
    sb.from('restaurants').select('id,name_ko,name_en,address,phone').ilike('name_ko', pattern).limit(15),
    sb.from('restaurants').select('id,name_ko,name_en,address,phone').ilike('name_en', pattern).limit(15),
    sb.from('restaurants').select('id,name_ko,name_en,address,phone').ilike('address', pattern).limit(15),
  ]);
  for (const result of [ko, en, address]) if (result.error) throw result.error;
  const unique = new Map<string, ClaimableRestaurant>();
  for (const row of [...(ko.data ?? []), ...(en.data ?? []), ...(address.data ?? [])]) {
    unique.set(String(row.id), {
      id: String(row.id),
      nameKo: String(row.name_ko ?? ''),
      nameEn: String(row.name_en ?? ''),
      address: String(row.address ?? ''),
      phone: String(row.phone ?? ''),
    });
  }
  return [...unique.values()].slice(0, 30);
}
