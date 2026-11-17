import type { TranslationKey } from '@/i18n/translations';

// Week 12 "no error leakage": raw server errors (e.g. "new row violates
// row-level security policy for table reservations") were shown to users.
// They confuse people and tell an attacker how the database works.
// Now: the details go to the developer console only; the user sees a short,
// translated message.

// An error whose message was written for the user (already translated),
// e.g. "Enter a valid email". Safe to show as it is.
export class UserFacingError extends Error {}

// Known problems people can fix themselves get their own message.
// Everything else gets the screen's fallback message.
export function knownErrorKey(error: unknown): TranslationKey | null {
  const err = error as { code?: unknown; status?: unknown; message?: unknown } | null;
  const code = typeof err?.code === 'string' ? err.code : '';
  const message = typeof err?.message === 'string' ? err.message.toLowerCase() : '';

  if (code === 'otp_expired' || message.includes('token has expired or is invalid')) return 'errorCodeWrong';
  if (code.includes('rate_limit') || err?.status === 429 || message.includes('rate limit')) return 'errorTooManyTries';
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) return 'errorWrongPassword';
  if (message.includes('network request failed') || message.includes('failed to fetch')) return 'connectionError';
  return null;
}

// What to show the user for an error. `fallback` is the screen's own
// translated message, e.g. t('pleaseTryAgain').
export function userMessage(
  error: unknown,
  fallback: string,
  t?: (key: TranslationKey) => string,
): string {
  if (error instanceof UserFacingError) return error.message;
  console.warn('[Mukji] error hidden from the user:', error);
  const key = t ? knownErrorKey(error) : null;
  return key && t ? t(key) : fallback;
}
