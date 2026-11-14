import { getAppMode, setAppMode } from '@/data/app-mode';
import { isWelcomeAfterSignOutPending, startGuestSession } from '@/data/auth';
import { supabase } from '@/data/supabase';

export type WelcomeDestination = 'welcome' | 'user' | 'business';

/** Decide whether the root route should show Welcome or restore an app mode. */
export async function getWelcomeDestination(): Promise<WelcomeDestination> {
  if (await isWelcomeAfterSignOutPending()) return 'welcome';

  const mode = await getAppMode();
  if (!mode) return 'welcome';
  if (mode === 'user') return 'user';

  const { data } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const user = data.session?.user;

  if (!user || user.is_anonymous) {
    await setAppMode('user');
    return 'user';
  }

  return 'business';
}

/** Create a guest session only after the user explicitly chooses guest access. */
export async function continueAsGuest(): Promise<void> {
  await startGuestSession();
  await setAppMode('user');
}
