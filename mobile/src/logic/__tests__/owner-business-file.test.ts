import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { readWebOwnerBusinessFile } from '../owner-business-file';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('readWebOwnerBusinessFile', () => {
  it('reads bytes from a successful browser picker URI', async () => {
    const expected = new Uint8Array([1, 2, 3, 4]).buffer;
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => expected,
    } as Response);

    const result = await readWebOwnerBusinessFile('blob:https://localhost/document');

    expect([...new Uint8Array(result)]).toEqual([1, 2, 3, 4]);
    expect(globalThis.fetch).toHaveBeenCalledWith('blob:https://localhost/document');
  });

  it('rejects an unreadable browser picker URI', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);

    await expect(readWebOwnerBusinessFile('blob:invalid')).rejects.toThrow(
      'Could not read the selected document.',
    );
  });
});
