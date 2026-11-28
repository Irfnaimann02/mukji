import { clearAppMode } from '@/data/app-mode';
import { signOutToWelcome } from '@/data/auth';
import { clearSavedDataOnPhone, sendPendingSavedData } from '@/data/saved-data-sync';
import { withTimeout } from '@/logic/with-timeout';

/** Sign out and return to Welcome without creating a replacement guest session. */
export async function signOutAndReturnToWelcome(): Promise<void> {
  // #119: changes that could not reach the account yet get one short last chance.
  await withTimeout(sendPendingSavedData(), 3000).catch(() => undefined);

  // Clear the signed-in account's server/local preference before its session ends.
  await clearAppMode();
  await signOutToWelcome();

  // #119: the next person on this phone must not see this user's profile, favourites
  // or searches (the app language stays). Also done on Supabase's SIGNED_OUT event.
  try {
    await clearSavedDataOnPhone();
  } catch (error) {
    console.warn('Could not clear saved data from the phone:', error);
  }

  // The sign-out guard prevents a new session, but clear the device-wide key as
  // a best-effort cleanup in case another auth listener wrote it during teardown.
  try {
    await clearAppMode();
  } catch (error) {
    console.warn('Could not finish clearing the saved app mode:', error);
  }
}
