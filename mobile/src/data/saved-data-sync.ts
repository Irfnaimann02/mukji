import type { User } from '@supabase/supabase-js';

import {
  clearFavouritesOnPhone,
  getFavourites,
  replaceFavouritesFromAccount,
  type FavouriteRecord,
} from '@/data/favourites-store';
import {
  clearProfilePending,
  isProfilePending,
  loadLocalProfile,
  pushProfile,
  saveLocalProfile,
  saveProfile,
} from '@/data/profile-store';
import { readSavedDataOwner, syncedAccountId, writeSavedDataOwner } from '@/data/saved-data-owner';
import { copyGuestDataToAccount, fetchProfileRow } from '@/data/saved-data-remote';
import {
  clearRecentSearchesPending,
  isRecentSearchesPending,
  loadRecentSearches,
  pushRecentSearches,
  replaceRecentSearchesOnPhone,
} from '@/data/search-history-store';
import { supabase } from '@/data/supabase';
import { DEFAULT_PROFILE, type FoodProfile } from '@/data/types';
import {
  cleanRecentSearches,
  favouritesForMerge,
  planSync,
  profileAfterSignOut,
  profileFromRow,
  rowFromProfile,
  sameSavedProfile,
} from '@/logic/saved-data';

// #119 S17: keeps the phone's profile, favourites and recent searches in step with the
// signed-in email account (SQL 045). Guests keep everything on the phone only.
//   - First sign-in on a phone: the guest data is copied into the account once (diets and
//     allergies are combined with the account's, never dropped), then the account's data is loaded.
//   - Every app start: changes that could not be sent are sent, then the account is loaded.
//   - Sign-out (guest or account): the phone keeps only the language.

type ProfileListener = (profile: FoodProfile) => void;
const profileListeners = new Set<ProfileListener>();

/** Called when the profile is replaced by the account's or cleared at sign-out. */
export function onProfileReplaced(listener: ProfileListener): () => void {
  profileListeners.add(listener);
  return () => {
    profileListeners.delete(listener);
  };
}

// Bumped on every sign-in change; work started for an older one is dropped.
let generation = 0;
let handledUserId: string | null = null;

async function replaceProfile(profile: FoodProfile): Promise<void> {
  await saveLocalProfile(profile);
  profileListeners.forEach((listener) => listener(profile));
}

async function clearLocalSavedData(): Promise<void> {
  const current = (await loadLocalProfile()) ?? DEFAULT_PROFILE;
  await Promise.all([
    replaceProfile(profileAfterSignOut(current)),
    clearFavouritesOnPhone(),
    replaceRecentSearchesOnPhone([]),
    clearProfilePending(),
    clearRecentSearchesPending(),
    writeSavedDataOwner(null),
  ]);
}

/** Sign-out: remove the profile (except the language), favourites and recent searches from the phone. */
export async function clearSavedDataOnPhone(): Promise<void> {
  generation++;
  handledUserId = null;
  await clearLocalSavedData();
}

/** Before sign-out: send changes that could not reach the account yet. */
export async function sendPendingSavedData(): Promise<void> {
  const accountId = await syncedAccountId();
  if (!accountId) return;
  if (await isProfilePending(accountId)) await pushProfile(accountId);
  if (await isRecentSearchesPending(accountId)) await pushRecentSearches(accountId);
}

async function refreshFromAccount(accountId: string, stillCurrent: () => boolean): Promise<void> {
  // 1. Changes made offline go first, so loading below does not undo them.
  if (await isProfilePending(accountId)) await pushProfile(accountId);
  if (await isRecentSearchesPending(accountId)) await pushRecentSearches(accountId);

  // 2. The account's profile and searches. An account with none yet gets the phone's.
  const row = await fetchProfileRow(accountId);
  if (!stillCurrent()) return;
  if (!row) {
    await pushProfile(accountId);
    await pushRecentSearches(accountId);
  } else {
    const local = (await loadLocalProfile()) ?? DEFAULT_PROFILE;
    if (stillCurrent() && !(await isProfilePending(accountId))) {
      await replaceProfile(profileFromRow(row, local.language));
    }
    if (stillCurrent() && !(await isRecentSearchesPending(accountId))) {
      await replaceRecentSearchesOnPhone(cleanRecentSearches(row.recent_searches));
    }
  }

  // 3. The account's favourites.
  if (stillCurrent()) await replaceFavouritesFromAccount(accountId, stillCurrent);
}

function copyPayload(profile: FoodProfile, recentSearches: string[], favourites: FavouriteRecord[]) {
  const row = rowFromProfile(profile);
  return {
    diets: row.diets,
    allergens: row.allergens,
    likes: row.likes,
    maxDistanceM: row.max_distance_m,
    recentSearches,
    favourites: favouritesForMerge(favourites),
  };
}

async function copyGuestDataThenRefresh(accountId: string, stillCurrent: () => boolean): Promise<void> {
  let sent = (await loadLocalProfile()) ?? DEFAULT_PROFILE;
  await copyGuestDataToAccount(copyPayload(sent, await loadRecentSearches(), await getFavourites()));

  // #119 review: signing in must never drop a diet or allergy. Until the phone is marked as
  // this account's, profile changes stay on the phone only, so:
  //   - a change made while copying is copied too (the database combines diets and allergies);
  //   - the account's (combined) profile replaces the phone's BEFORE the phone is marked;
  //   - a change made in between is then sent as a normal change.
  let applied: FoodProfile | null = null;
  for (let attempt = 0; attempt < 3 && !applied; attempt++) {
    const row = await fetchProfileRow(accountId);
    if (!stillCurrent()) return;
    const now = (await loadLocalProfile()) ?? DEFAULT_PROFILE;
    if (sameSavedProfile(now, sent)) {
      applied = row ? profileFromRow(row, now.language) : now;
      await replaceProfile(applied);
    } else {
      sent = now;
      await copyGuestDataToAccount(copyPayload(now, [], []));
    }
  }
  // Still changing after three tries: leave it for the next sign-in event or app start.
  if (!applied) throw new Error('The food profile kept changing during the first sign-in copy.');
  if (!stillCurrent()) return;

  // Copied: from now on the phone's data belongs to this account.
  await clearProfilePending();
  await clearRecentSearchesPending();
  await writeSavedDataOwner({ userId: accountId, guest: false });
  const latest = (await loadLocalProfile()) ?? DEFAULT_PROFILE;
  if (!sameSavedProfile(latest, applied)) await saveProfile(latest);
  await refreshFromAccount(accountId, stillCurrent);
}

async function handleSignedInUser(user: User | null, event: string): Promise<void> {
  if (!user) {
    if (event === 'SIGNED_OUT') await clearSavedDataOnPhone();
    return;
  }
  // Token refreshes and profile updates for the same login need no new sync.
  if (user.id === handledUserId) return;
  handledUserId = user.id;
  const myGeneration = ++generation;
  const stillCurrent = () => myGeneration === generation;
  const guest = user.is_anonymous === true;

  try {
    const plan = planSync(await readSavedDataOwner(), { id: user.id, guest });
    if (!stillCurrent()) return;

    switch (plan) {
      case 'keep-on-phone':
        await writeSavedDataOwner({ userId: user.id, guest: true });
        return;
      case 'clear-then-keep-on-phone':
        await clearLocalSavedData();
        if (stillCurrent()) await writeSavedDataOwner({ userId: user.id, guest: true });
        return;
      case 'refresh-from-account':
        await refreshFromAccount(user.id, stillCurrent);
        return;
      case 'clear-then-refresh':
        await clearLocalSavedData();
        if (!stillCurrent()) return;
        await writeSavedDataOwner({ userId: user.id, guest: false });
        await refreshFromAccount(user.id, stillCurrent);
        return;
      case 'copy-guest-data-then-refresh':
        await copyGuestDataThenRefresh(user.id, stillCurrent);
        return;
    }
  } catch (error) {
    console.warn('[Mukji] could not sync saved data with the account:', error);
    // Try again on the next sign-in event or app start.
    if (stillCurrent()) handledUserId = null;
  }
}

/** Start keeping the phone's saved data in step with the login. Returns a stop function. */
export function startSavedDataSync(): () => void {
  if (!supabase) return () => {};
  const sb = supabase;
  let alive = true;

  sb.auth
    .getSession()
    .then(({ data }) => {
      if (alive) void handleSignedInUser(data.session?.user ?? null, 'INITIAL_SESSION');
    })
    .catch((error) => console.warn('[Mukji] could not read the login:', error));

  const { data } = sb.auth.onAuthStateChange((event, session) => {
    // Supabase advice: do not wait on other Supabase calls inside this callback.
    setTimeout(() => {
      if (alive) void handleSignedInUser(session?.user ?? null, event);
    }, 0);
  });

  return () => {
    alive = false;
    data.subscription.unsubscribe();
  };
}
