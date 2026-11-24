import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import {
  fetchRestaurantsByIds,
  fetchRestaurantsNear,
  searchRestaurantRows,
} from '@/data/restaurant-repository'; // jest.mock below is hoisted above this

// #48: Mukji holds every licensed restaurant in Ansan, so the app must never ask for
// all of them. These tests use a fake Supabase client that records each request.

type Call = { table: string; steps: [string, unknown[]][] };
const mockCalls: Call[] = [];

function mockRequest(table: string, rows: unknown[] = []) {
  const call: Call = { table, steps: [] };
  mockCalls.push(call);
  const builder: any = new Proxy(
    {},
    {
      get(_target, name: string) {
        if (name === 'then') {
          return (resolve: (value: unknown) => void) => resolve({ data: rows, error: null });
        }
        return (...args: unknown[]) => {
          call.steps.push([name, args]);
          return builder;
        };
      },
    },
  );
  return builder;
}

jest.mock('@/data/supabase', () => ({
  supabase: {
    from: (table: string) => mockRequest(table),
    rpc: (fn: string, args: unknown) => {
      const builder = mockRequest(`rpc:${fn}`);
      mockCalls[mockCalls.length - 1].steps.push(['args', [args]]);
      return builder;
    },
  },
}));

const step = (call: Call, name: string) => call.steps.find(([n]) => n === name)?.[1];

beforeEach(() => {
  mockCalls.length = 0;
});

describe('loading restaurants without downloading all of Ansan', () => {
  test('the map asks the database for restaurants near a point, never the whole table', async () => {
    await fetchRestaurantsNear(37.2967, 126.836, 1500);
    const near = mockCalls.find((c) => c.table === 'rpc:restaurants_near');
    expect(near).toBeDefined();
    expect(step(near!, 'args')).toEqual([{ p_lat: 37.2967, p_lng: 126.836, p_radius_m: 1500, p_max: 600 }]);
    expect(mockCalls.some((c) => c.table === 'restaurants')).toBe(false);
  });

  test('favourites and bookings load only their own ids, a hundred at a time', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `lic-${i}`);
    await fetchRestaurantsByIds([...ids, 'lic-1']);
    const byId = mockCalls.filter((c) => c.table === 'restaurants');
    expect(byId).toHaveLength(3);
    expect(byId.map((c) => (step(c, 'in')![1] as string[]).length)).toEqual([100, 100, 50]);
    expect(await fetchRestaurantsByIds([])).toEqual([]);
  });

  test('a search word cannot change the query: only letters, numbers and spaces reach the filter', async () => {
    await searchRestaurantRows('치킨),id.eq.r01,(name_ko');
    const filterOf = (table: string) =>
      String(step(mockCalls.find((c) => c.table === table && step(c, 'or'))!, 'or')![0]);
    const like = '%치킨 id eq r01 name ko%';
    // Exactly our own conditions, nothing added by the word.
    expect(filterOf('restaurants')).toBe(`name_ko.ilike.${like},name_en.ilike.${like},food_type.ilike.${like}`);
    expect(filterOf('dishes')).toBe(`name_ko.ilike.${like},name_en.ilike.${like}`);
    mockCalls.length = 0;
    expect(await searchRestaurantRows('  ().,%  ')).toEqual([]);
    expect(mockCalls).toHaveLength(0);
  });
});
