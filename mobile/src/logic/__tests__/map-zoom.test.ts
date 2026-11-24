import { describe, expect, test } from '@jest/globals';

import {
  MAX_LARGE_LATITUDE_DELTA,
  MAX_MEDIUM_LATITUDE_DELTA,
  MAX_PIN_LATITUDE_DELTA,
  pinSizeFor,
  pinsInView,
  zoomedInEnough,
} from '@/logic/map-zoom';

const region = (latitudeDelta: number) => ({
  latitude: 37.2967,
  longitude: 126.836,
  latitudeDelta,
  longitudeDelta: latitudeDelta,
});

const pin = (id: string, latitude: number, longitude: number) => ({ id, latitude, longitude });

describe('search map zoom', () => {
  const pins = [
    pin('centre', 37.2967, 126.836),
    pin('edge', 37.2967 + 0.0055, 126.836), // just past the top edge of a 0.01° view, inside the margin
    pin('far', 37.31, 126.836), // well off screen
  ];

  test('pins get smaller as you zoom out, then disappear', () => {
    expect(pinSizeFor(region(MAX_LARGE_LATITUDE_DELTA))).toBe('large');
    expect(pinSizeFor(region(0.01))).toBe('medium'); // the opening zoom
    expect(pinSizeFor(region(MAX_MEDIUM_LATITUDE_DELTA))).toBe('medium');
    expect(pinSizeFor(region(0.02))).toBe('dot');
    expect(pinSizeFor(region(MAX_PIN_LATITUDE_DELTA))).toBe('dot');
    expect(pinSizeFor(region(MAX_PIN_LATITUDE_DELTA * 2))).toBeNull();
  });

  test('zoomed out too far: no pins at all', () => {
    expect(zoomedInEnough(region(MAX_PIN_LATITUDE_DELTA * 2))).toBe(false);
    expect(pinsInView(pins, region(MAX_PIN_LATITUDE_DELTA * 2))).toEqual([]);
  });

  test('zoomed in: only pins on screen (plus a small margin)', () => {
    expect(pinsInView(pins, region(0.01)).map((p) => p.id)).toEqual(['centre', 'edge']);
  });
});
