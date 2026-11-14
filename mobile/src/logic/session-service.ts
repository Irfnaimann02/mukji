import { clearAppMode } from '@/data/app-mode';
import { signOutToWelcome } from '@/data/auth';

/** Sign out and return to Welcome without creating a replacement guest session. */
export async function signOutAndReturnToWelcome(): Promise<void> {
  // Clear the signed-in account's server/local preference before its session ends.
  await clearAppMode();
  await signOutToWelcome();

  // The sign-out guard prevents a new session, but clear the device-wide key as
  // a best-effort cleanup in case another auth listener wrote it during teardown.
  try {
    await clearAppMode();
  } catch (error) {
    console.warn('Could not finish clearing the saved app mode:', error);
  }
}
