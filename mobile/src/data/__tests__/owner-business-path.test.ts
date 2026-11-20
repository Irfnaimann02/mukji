import { describe, expect, it } from '@jest/globals';

import { isOwnerBusinessStoragePath } from '../owner-business-path';

describe('isOwnerBusinessStoragePath', () => {
  const userId = 'user-123';
  const applicationId = 'application-456';

  it('accepts a file directly inside the applicant draft folder', () => {
    expect(isOwnerBusinessStoragePath(
      `${userId}/${applicationId}/registration.pdf`,
      userId,
      applicationId,
    )).toBe(true);
  });

  it('rejects another user or another application folder', () => {
    expect(isOwnerBusinessStoragePath('other-user/application-456/file.pdf', userId, applicationId)).toBe(false);
    expect(isOwnerBusinessStoragePath('user-123/other-application/file.pdf', userId, applicationId)).toBe(false);
  });

  it('rejects empty filenames, nested paths and traversal-like segments', () => {
    expect(isOwnerBusinessStoragePath(`${userId}/${applicationId}/`, userId, applicationId)).toBe(false);
    expect(isOwnerBusinessStoragePath(`${userId}/${applicationId}/nested/file.pdf`, userId, applicationId)).toBe(false);
    expect(isOwnerBusinessStoragePath(`${userId}/${applicationId}/..`, userId, applicationId)).toBe(false);
    expect(isOwnerBusinessStoragePath(`${userId}/${applicationId}/..\\secret`, userId, applicationId)).toBe(false);
  });
});
