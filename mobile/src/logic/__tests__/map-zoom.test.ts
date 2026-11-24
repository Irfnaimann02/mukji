import { describe, expect, test } from '@jest/globals';

import {
  MAX_NAME_LATITUDE_DELTA,
  MAX_PIN_LATITUDE_DELTA,
  pinsInView,
  showPinNames,
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

  test('zoomed out too far: no pins at all', () => {
    expect(zoomedInEnough(region(MAX_PIN_LATITUDE_DELTA * 2))).toBe(false);
    expect(pinsInView(pins, region(MAX_PIN_LATITUDE_DELTA * 2))).toEqual([]);
  });

  test('zoomed in: only pins on screen (plus a small margin)', () => {
    expect(pinsInView(pins, region(0.01)).map((p) => p.id)).toEqual(['centre', 'edge']);
  });

  test('the limit itself still shows pins', () => {
    expect(zoomedInEnough(region(MAX_PIN_LATITUDE_DELTA))).toBe(true);
  });

  test('names show from the opening zoom inward, not further out', () => {
    expect(showPinNames(region(MAX_NAME_LATITUDE_DELTA))).toBe(true);
    expect(showPinNames(region(0.015))).toBe(false); // pins yes, names no
    expect(zoomedInEnough(region(0.015))).toBe(true);
  });
});
