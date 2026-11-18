import { describe, expect, jest, test } from '@jest/globals';

import type { TranslationKey } from '@/i18n/translations';
import { UserFacingError, userMessage } from '@/logic/user-error';

// Week 12 "no error leakage": a raw database error must never reach the user.

const t = (key: TranslationKey) => `<${key}>`;

describe('error messages shown to users', () => {
  test('a raw database error is hidden behind the screen message', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = new Error('new row violates row-level security policy for table "reservations"');
    expect(userMessage(raw, 'Please try again.', t)).toBe('Please try again.');
    expect(userMessage('weird non-error', 'Please try again.', t)).toBe('Please try again.');
  });

  test('known problems the user can fix get their own message; our own messages pass through', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(userMessage({ code: 'otp_expired', message: 'Token has expired or is invalid' }, 'x', t)).toBe('<errorCodeWrong>');
    expect(userMessage({ status: 429, message: 'email rate limit exceeded' }, 'x', t)).toBe('<errorTooManyTries>');
    expect(userMessage(new TypeError('Network request failed'), 'x', t)).toBe('<connectionError>');
    expect(userMessage(new UserFacingError('Enter a valid email'), 'x', t)).toBe('Enter a valid email');
  });
});
