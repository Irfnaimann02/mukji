/** Validate the exact user/application/file path used by the private document bucket. */
export function isOwnerBusinessStoragePath(
  path: string,
  userId: string,
  applicationId: string,
): boolean {
  const segments = path.split('/');
  return segments.length === 3
    && segments[0] === userId
    && segments[1] === applicationId
    && segments[2].length > 0
    && segments[2] !== '.'
    && segments[2] !== '..'
    && !path.includes('\\');
}
