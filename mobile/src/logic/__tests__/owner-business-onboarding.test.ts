import { describe, expect, it } from '@jest/globals';

import {
  normalizeBusinessRegistrationNumber,
  resolveOwnerDocumentMimeType,
  validateOwnerBusinessDetails,
  validateOwnerDocument,
  type OwnerBusinessDetails,
} from '../owner-business-onboarding';

const validDetails: OwnerBusinessDetails = {
  applicantType: 'business_owner',
  applicantFullName: 'Test Applicant',
  applicantPhone: '+82 10-1234-5678',
  applicantEmail: 'test@example.com',
  businessType: 'individual',
  businessRegistrationNumber: '123-45-67890',
  registeredBusinessName: '테스트 식당',
  legalRepresentativeName: 'Test Applicant',
  businessContactPhone: '031-123-4567',
  registeredAddress: '경기도 안산시 상록구 테스트로 1',
};

describe('owner business onboarding validation', () => {
  it('accepts complete business details', () => {
    expect(validateOwnerBusinessDetails(validDetails)).toBeNull();
  });

  it('requires an applicant relationship', () => {
    expect(validateOwnerBusinessDetails({ ...validDetails, applicantType: null })).toBe('applicantType');
  });

  it('requires a ten-digit Korean business registration number', () => {
    expect(validateOwnerBusinessDetails({ ...validDetails, businessRegistrationNumber: '123-45' }))
      .toBe('businessRegistrationNumber');
  });

  it('normalizes the business registration number to digits', () => {
    expect(normalizeBusinessRegistrationNumber('123-45-67890')).toBe('1234567890');
  });

  it('rejects a business registration number with more than ten digits', () => {
    expect(validateOwnerBusinessDetails({ ...validDetails, businessRegistrationNumber: '123-45-678901' }))
      .toBe('businessRegistrationNumber');
  });

  it('rejects an invalid applicant email', () => {
    expect(validateOwnerBusinessDetails({ ...validDetails, applicantEmail: 'not-an-email' }))
      .toBe('applicantEmail');
  });

  it('rejects an invalid business contact number', () => {
    expect(validateOwnerBusinessDetails({ ...validDetails, businessContactPhone: '123' }))
      .toBe('businessContactPhone');
  });
});

describe('owner business document validation', () => {
  it('accepts PDF and image documents', () => {
    expect(resolveOwnerDocumentMimeType('application/pdf', 'certificate.pdf')).toBe('application/pdf');
    expect(resolveOwnerDocumentMimeType('image/jpeg', 'certificate.jpg')).toBe('image/jpeg');
    expect(resolveOwnerDocumentMimeType(undefined, 'certificate.png')).toBe('image/png');
  });

  it('rejects unsupported file types', () => {
    expect(validateOwnerDocument('application/zip', 'archive.zip', 1000)).toBe('unsupportedType');
  });

  it('does not trust a PDF extension when the picker reports another MIME type', () => {
    expect(validateOwnerDocument('application/zip', 'archive.pdf', 1000)).toBe('unsupportedType');
  });

  it('rejects empty or oversized files', () => {
    expect(validateOwnerDocument('application/pdf', 'document.pdf', 0)).toBe('tooLarge');
    expect(validateOwnerDocument('application/pdf', 'document.pdf', 10 * 1024 * 1024 + 1)).toBe('tooLarge');
  });
});
