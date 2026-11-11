import type { User } from '@supabase/supabase-js';

import { supabase } from '@/data/supabase';

// #45 Login.
// - Everyone gets an anonymous account automatically (no sign-up screen).
// - Restaurant owners sign in with their email and a code sent by email.
// - A user is an owner only if the team added them to the `owners` table.

function client() {
  if (!supabase) throw new Error('Supabase is not set up (mobile/.env is missing).');
  return supabase;
}

let pending: Promise<User> | null = null;

// Returns the signed-in user. The first time, it creates an anonymous one.
// Call this before saving anything that belongs to a user (review, reservation).
export async function ensureSignedIn(): Promise<User> {
  const sb = client();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user;

  // Two screens asking at the same time must not create two accounts.
  if (!pending) {
    pending = sb.auth
      .signInAnonymously()
      .then(({ data: result, error }) => {
        if (error || !result.user) throw error ?? new Error('Anonymous sign-in failed.');
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

// Step 1 for owners: email them a code.
export async function sendOwnerCode(email: string): Promise<void> {
  const { error } = await client().auth.signInWithOtp({
    email: cleanEmail(email),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

// Step 2 for owners: check the code from the email.
export async function verifyOwnerCode(email: string, code: string): Promise<User> {
  const { data, error } = await client().auth.verifyOtp({
    email: cleanEmail(email),
    token: code.trim(),
    type: 'email',
  });
  if (error || !data.user) throw error ?? new Error('Wrong or expired code.');
  return data.user;
}

// The restaurants this user owns. Row Level Security only returns the user's own rows.
export async function myOwnedRestaurantIds(): Promise<string[]> {
  const { data, error } = await client().from('owners').select('restaurant_id');
  if (error) throw error;
  return (data ?? []).map((row) => row.restaurant_id as string);
}

// Signing out ends the owner session. The app then starts a new anonymous one.
export async function signOut(): Promise<void> {
  const { error } = await client().auth.signOut();
  if (error) throw error;
}
