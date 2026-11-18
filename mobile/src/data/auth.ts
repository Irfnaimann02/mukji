import type { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/data/supabase';

// #45 authentication. Anonymous sessions let people browse without registration.
// Email OTP can create a permanent user or business account.
// Restaurant management permission is NOT granted by account type: the team
// controls access through rows in public.owners and Supabase RLS.

function client() {
  if (!supabase) throw new Error('Supabase is not set up (mobile/.env is missing).');
  return supabase;
}

let pending: Promise<User> | null = null;

// Keep the app on Welcome after an intentional sign-out. This is shared by
// every useAuth() listener and persisted so a quick app restart cannot create
// another anonymous session before the user chooses an experience.
const WELCOME_AFTER_SIGN_OUT_KEY = 'mukji_welcome_after_sign_out_v1';
let welcomeAfterSignOut = false;

export function shouldStayOnWelcomeAfterSignOut(): boolean {
  return welcomeAfterSignOut;
}

export async function isWelcomeAfterSignOutPending(): Promise<boolean> {
  if (welcomeAfterSignOut) return true;
  try {
    const saved = await AsyncStorage.getItem(WELCOME_AFTER_SIGN_OUT_KEY);
    // Do not let an older storage read overwrite a sign-out that happened
    // while this asynchronous check was in progress.
    if (!welcomeAfterSignOut) welcomeAfterSignOut = saved === 'true';
  } catch {
    // The in-memory flag still protects the current app session.
  }
  return welcomeAfterSignOut;
}

/** Start a guest session only after the user explicitly chooses that option. */
export async function clearWelcomeAfterSignOutFlag(): Promise<void> {
  welcomeAfterSignOut = false;
  await AsyncStorage.removeItem(WELCOME_AFTER_SIGN_OUT_KEY);
}

export async function startGuestSession(): Promise<User | null> {
  await clearWelcomeAfterSignOutFlag();
  return supabase ? ensureSignedIn() : null;
}

export async function ensureSignedIn(): Promise<User> {
  if (await isWelcomeAfterSignOutPending() || welcomeAfterSignOut) {
    throw new Error('Guest sign-in is paused until you choose an option on the Welcome screen.');
  }
  const sb = client();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user;

  if (welcomeAfterSignOut) {
    throw new Error('Guest sign-in is paused until you choose an option on the Welcome screen.');
  }

  if (!pending) {
    pending = sb.auth
      .signInAnonymously()
      .then(async ({ data: result, error }) => {
        if (error || !result.user) throw error ?? new Error('Anonymous sign-in failed.');

        // A sign-out may happen while the anonymous request is in flight.
        // Do not let that late response silently recreate the guest session.
        if (shouldStayOnWelcomeAfterSignOut() || await isWelcomeAfterSignOutPending()) {
          await sb.auth.signOut();
          throw new Error('Guest sign-in is paused until you choose an option on the Welcome screen.');
        }

        return result.user;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

function cleanEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(email));
}

export async function sendEmailCode(email: string): Promise<void> {
  // Choosing either login path is an explicit action after the Welcome screen.
  await clearWelcomeAfterSignOutFlag();
  const { error } = await client().auth.signInWithOtp({
    email: cleanEmail(email),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string): Promise<User> {
  const { data, error } = await client().auth.verifyOtp({
    email: cleanEmail(email),
    token: code.trim(),
    type: 'email',
  });
  if (error || !data.user) throw error ?? new Error('Wrong or expired code.');
  return data.user;
}

/**
 * Save the verified applicant's self-reported partner profile in Supabase Auth
 * user metadata. This metadata is user-editable and MUST NOT be used as proof
 * of restaurant ownership or as an authorization decision.
 */
export async function saveOwnerApplicantProfile(profile: {
  applicantType: 'business_owner' | 'authorized_representative';
  fullName: string;
  phone: string;
}): Promise<void> {
  const sb = client();
  const { data, error: userError } = await sb.auth.getUser();

  if (userError) throw userError;
  if (!data.user || data.user.is_anonymous) {
    throw new Error('Verify your email before saving your partner profile.');
  }

  const { error } = await sb.auth.updateUser({
    data: {
      owner_applicant_type: profile.applicantType,
      owner_applicant_full_name: profile.fullName.trim(),
      owner_applicant_phone: profile.phone.trim(),
      owner_applicant_email: cleanEmail(data.user.email ?? ''),
      owner_applicant_terms_acknowledged_at: new Date().toISOString(),
      owner_applicant_profile_updated_at: new Date().toISOString(),
    },
  });

  if (error) throw error;
}

// Dev builds only: shared test accounts made in the Supabase dashboard
// (e.g. owner-test@example.com) cannot receive email codes, so they sign in
// with a password. The owner login screen shows this only when __DEV__ is true.
export async function signInTestAccount(email: string, password: string): Promise<User> {
  await clearWelcomeAfterSignOutFlag();
  const { data, error } = await client().auth.signInWithPassword({
    email: cleanEmail(email),
    password,
  });
  if (error || !data.user) throw error ?? new Error('Wrong email or password.');
  return data.user;
}

// Backwards-compatible names used by the existing Issue #45 owner login.
export const sendOwnerCode = sendEmailCode;
export const verifyOwnerCode = verifyEmailCode;

export async function myOwnedRestaurantIds(): Promise<string[]> {
  const { data, error } = await client().from('owners').select('restaurant_id');
  if (error) throw error;
  return (data ?? []).map((row) => row.restaurant_id as string);
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await client().auth.signOut();
  if (error) throw error;
}

export async function signOutToWelcome(): Promise<void> {
  // Set this before Supabase emits SIGNED_OUT. Every mounted auth listener
  // must see the same flag; a one-time consume flag races when there are
  // multiple useAuth() instances.
  welcomeAfterSignOut = true;
  await AsyncStorage.setItem(WELCOME_AFTER_SIGN_OUT_KEY, 'true');

  if (!supabase) return;
  try {
    const { error } = await client().auth.signOut();
    if (error) throw error;
  } catch (error) {
    // If Supabase rejects sign-out, restore normal auth behavior rather than
    // leaving the signed-in user in a permanently suppressed state.
    await clearWelcomeAfterSignOutFlag();
    throw error;
  }
}
