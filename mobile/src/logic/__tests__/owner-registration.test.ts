
import { describe, expect, it } from '@jest/globals';
import {
  normalizeOwnerPhone,
  validateOwnerRegistration,
  type OwnerRegistrationDetails,
} from '../owner-registration';

const validDetails: OwnerRegistrationDetails = {
  applicantType: 'business_owner',
  fullName: 'Test Applicant',
  phone: '+821012345678',
  email: 'test@example.com',
  acknowledgedNotice: true,
};

describe('validateOwnerRegistration', () => {
  it('accepts a complete valid applicant profile', () => {
    expect(validateOwnerRegistration(validDetails)).toBeNull();
  });

  it('requires an applicant type', () => {
    expect(
      validateOwnerRegistration({ ...validDetails, applicantType: null }),
    ).toBe('applicantType');
  });

  it('requires a full name', () => {
    expect(
      validateOwnerRegistration({ ...validDetails, fullName: ' ' }),
    ).toBe('fullName');
  });

  it('rejects phone numbers outside 7 to 15 digits', () => {
    expect(
      validateOwnerRegistration({ ...validDetails, phone: '12345' }),
    ).toBe('invalidPhone');

    expect(
      validateOwnerRegistration({
        ...validDetails,
        phone: '1234567890123456',
      }),
    ).toBe('invalidPhone');
  });

  it('rejects invalid email addresses', () => {
    expect(
      validateOwnerRegistration({ ...validDetails, email: 'not-an-email' }),
    ).toBe('email');
  });

  it('requires acknowledgement of the access notice', () => {
    expect(
      validateOwnerRegistration({
        ...validDetails,
        acknowledgedNotice: false,
      }),
    ).toBe('notice');
  });
});

describe('normalizeOwnerPhone', () => {
  it('preserves a leading plus and removes formatting characters', () => {
    expect(normalizeOwnerPhone('+82 10-1234-5678')).toBe('+821012345678');
  });

  it('does not invent a country code', () => {
    expect(normalizeOwnerPhone('010-1234-5678')).toBe('01012345678');
  });
});
