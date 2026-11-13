import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { ensureSignedIn, isWelcomeAfterSignOutPending, shouldStayOnWelcomeAfterSignOut } from '@/data/auth';
import { supabase } from '@/data/supabase';

export type AuthState = {
  ready: boolean; // false until we know who the user is
  user: User | null;
  isAnonymous: boolean; // true = guest account made automatically
  email: string | null; // set when signed in as an owner
  error: string | null;
};

// #45: who is signed in. Signs in anonymously the first time it is used.
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  // Without mobile/.env there is no Supabase: we are "ready" with no user.
  const [ready, setReady] = useState(supabase === null);
  const [error, setError] = useState<string | null>(
    supabase === null ? 'Supabase is not set up (mobile/.env is missing).' : null,
  );

  useEffect(() => {
    if (!supabase) return;

    let alive = true;

    const signIn = async () => {
      try {
        // A deliberate sign-out must not be undone by an auth hook mounting
        // again or by another SIGNED_OUT listener.
        if (await isWelcomeAfterSignOutPending()) {
          if (alive) setUser(null);
          return;
        }
        const signedInUser = await ensureSignedIn();
        if (alive && !shouldStayOnWelcomeAfterSignOut()) setUser(signedInUser);
      } catch (e) {
        if (alive && !shouldStayOnWelcomeAfterSignOut()) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (alive) setReady(true);
      }
    };

    void signIn();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      // After an owner signs out, go back to a guest account.
      if (event === 'SIGNED_OUT' && !shouldStayOnWelcomeAfterSignOut()) void signIn();
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return {
    ready,
    user,
    isAnonymous: user?.is_anonymous ?? false,
    email: user?.email ?? null,
    error,
  };
}
