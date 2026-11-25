import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { TeamOwnerError, type PendingOwnerApplication } from '@/data/team-owner-repository';
import {
  applicationTitle,
  approvalTarget,
  decideOwnerApplication,
  reviewProblem,
  teamOwnerErrorKey,
} from '@/logic/team-owner-tools';

// The database calls are mocked; SQL 043 has its own test (supabase/tests/043_*.sql).
jest.mock('@/data/supabase', () => ({ supabase: null }));
const mockReview = jest.fn<(...args: unknown[]) => Promise<void>>();
jest.mock('@/data/team-owner-repository', () => {
  const actual = jest.requireActual<typeof import('@/data/team-owner-repository')>('@/data/team-owner-repository');
  return { ...actual, reviewOwnerApplication: (...args: unknown[]) => mockReview(...args) };
});

const application = (overrides: Partial<PendingOwnerApplication> = {}): PendingOwnerApplication => ({
  id: 'app-1',
  status: 'submitted',
  applicationType: 'claim',
  submittedAt: '2026-11-25T00:00:00Z',
  existingRestaurantId: 'r16',
  existingRestaurantNameKo: '트라이뽀티(TriBoTea)',
  existingRestaurantAddress: '안산시',
  restaurantNameKo: null,
  restaurantNameEn: null,
  category: null,
  address: null,
  phone: null,
  description: null,
  business: {
    applicantType: 'business_owner',
    applicantFullName: 'Test Owner',
    applicantPhone: '01012345678',
    applicantEmail: 'owner@example.test',
    businessType: 'individual',
    businessRegistrationNumber: '1234567890',
    registeredBusinessName: '테스트 상호',
    legalRepresentativeName: 'Test Owner',
    businessContactPhone: '0311234567',
    registeredAddress: '안산시',
  },
  documents: [],
  ...overrides,
});

const newPlace = application({
  applicationType: 'new',
  existingRestaurantId: null,
  existingRestaurantNameKo: null,
  restaurantNameKo: '새 가게',
  restaurantNameEn: 'New Place',
});

beforeEach(() => {
  mockReview.mockReset();
  mockReview.mockResolvedValue(undefined);
});

describe('#118 reviewing owner applications', () => {
  test('reject needs a reason the owner can read', () => {
    expect(reviewProblem(application(), false, '', null)).toBe('reason_required');
    expect(reviewProblem(application(), false, '  no  ', null)).toBe('reason_required');
    expect(reviewProblem(application(), false, 'Document is unreadable.', null)).toBeNull();
  });

  test('approving a claim needs nothing extra; a new restaurant needs a listing', () => {
    expect(reviewProblem(application(), true, '', approvalTarget(application(), null))).toBeNull();
    expect(reviewProblem(newPlace, true, '', approvalTarget(newPlace, null))).toBe('restaurant_required');
    expect(reviewProblem(newPlace, true, '', approvalTarget(newPlace, 'r04'))).toBeNull();
  });

  test('a claim always goes to the restaurant the owner picked', () => {
    expect(approvalTarget(application(), 'r04')).toBe('r16');
    expect(approvalTarget(newPlace, 'r04')).toBe('r04');
  });

  test('messages over 500 characters are refused', () => {
    expect(reviewProblem(application(), true, 'x'.repeat(501), 'r16')).toBe('message_too_long');
  });

  test('decide sends the right restaurant to the database', async () => {
    await decideOwnerApplication(application(), true, '', 'r04');
    expect(mockReview).toHaveBeenLastCalledWith('app-1', true, '', null); // claim: no other id
    await decideOwnerApplication(newPlace, true, 'Linked to the listing.', 'r04');
    expect(mockReview).toHaveBeenLastCalledWith('app-1', true, 'Linked to the listing.', 'r04');
    await decideOwnerApplication(newPlace, false, 'We could not find it.', 'r04');
    expect(mockReview).toHaveBeenLastCalledWith('app-1', false, 'We could not find it.', null);
  });

  test('decide stops before the database when something is missing', async () => {
    await expect(decideOwnerApplication(newPlace, true, '', null)).rejects.toMatchObject({ code: 'restaurant_required' });
    await expect(decideOwnerApplication(application(), false, '', null)).rejects.toMatchObject({ code: 'reason_required' });
    expect(mockReview).not.toHaveBeenCalled();
  });

  test('titles: the listed name for a claim, the typed name for a new place', () => {
    expect(applicationTitle(application())).toBe('트라이뽀티(TriBoTea)');
    expect(applicationTitle(newPlace)).toBe('새 가게');
  });

  test('every error has a message', () => {
    expect(teamOwnerErrorKey(new TeamOwnerError('application_not_pending'))).toBe('teamOwnerErrorNotPending');
    expect(teamOwnerErrorKey('reason_required')).toBe('teamOwnerErrorReason');
    expect(teamOwnerErrorKey(new Error('offline'))).toBe('teamOwnerErrorUnknown');
  });
});
