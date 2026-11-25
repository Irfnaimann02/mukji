import { withTimeout } from '@/logic/with-timeout';
import { describe, expect, it, jest } from '@jest/globals';

describe('withTimeout', () => {
  it('gives the answer when it comes in time', async () => {
    await expect(withTimeout(Promise.resolve(5), 1000)).resolves.toBe(5);
  });

  it('gives up when there is no answer', async () => {
    jest.useFakeTimers();
    const never = new Promise<number>(() => {});
    const result = withTimeout(never, 1000);
    jest.advanceTimersByTime(1000);
    await expect(result).rejects.toThrow('timeout');
    jest.useRealTimers();
  });
});