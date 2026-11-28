import { supabase } from '@/data/supabase';
import type { FavouriteRow, ProfileRow } from '@/logic/saved-data';

// #119 S17: the only file that talks to Supabase about saved profiles, favourites and
// recent searches (tables user_profiles and user_favourites, SQL 045). The database lets
// an email account read and change only its own rows; guests are refused there too.

function client() {
  if (!supabase) throw new Error('Supabase is not set up (mobile/.env is missing).');
  return supabase;
}

/** The signed-in email account's id, or null for a guest, no login, or no Supabase. */
export async function currentAccountId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user && !user.is_anonymous ? user.id : null;
}

export async function fetchProfileRow(accountId: string): Promise<ProfileRow | null> {
  const { data, error } = await client()
    .from('user_profiles')
    .select('diets, allergens, likes, max_distance_m, recent_searches')
    .eq('user_id', accountId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

export async function saveProfileRow(
  accountId: string,
  row: { diets: string[]; allergens: string[]; likes: string[]; max_distance_m: number },
): Promise<void> {
  const { error } = await client()
    .from('user_profiles')
    .upsert({ user_id: accountId, ...row }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function saveRecentSearchesRow(accountId: string, recent: string[]): Promise<void> {
  const { error } = await client()
    .from('user_profiles')
    .upsert({ user_id: accountId, recent_searches: recent }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function fetchFavouriteRows(accountId: string): Promise<FavouriteRow[]> {
  const { data, error } = await client()
    .from('user_favourites')
    .select('restaurant_id, note, created_at, updated_at')
    .eq('user_id', accountId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as FavouriteRow[] | null) ?? [];
}

export async function addFavouriteRow(accountId: string, restaurantId: string): Promise<void> {
  const { error } = await client()
    .from('user_favourites')
    .upsert(
      { user_id: accountId, restaurant_id: restaurantId },
      { onConflict: 'user_id,restaurant_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function removeFavouriteRow(accountId: string, restaurantId: string): Promise<void> {
  const { error } = await client()
    .from('user_favourites')
    .delete()
    .eq('user_id', accountId)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
}

export async function saveFavouriteNoteRow(accountId: string, restaurantId: string, note: string): Promise<void> {
  const { error } = await client()
    .from('user_favourites')
    .update({ note })
    .eq('user_id', accountId)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
}

/** First sign-in on this phone: copy the phone's guest data into the account (SQL 045). */
export async function copyGuestDataToAccount(data: {
  diets: string[];
  allergens: string[];
  likes: string[];
  maxDistanceM: number;
  recentSearches: string[];
  favourites: FavouriteRow[];
}): Promise<void> {
  const { error } = await client().rpc('merge_guest_saved_data', {
    p_diets: data.diets,
    p_allergens: data.allergens,
    p_likes: data.likes,
    p_max_distance_m: data.maxDistanceM,
    p_recent_searches: data.recentSearches,
    p_favourites: data.favourites,
  });
  if (error) throw error;
}
