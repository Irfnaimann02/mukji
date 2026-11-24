// Search map: the further out you zoom, the smaller the pins get, so they don't pile up.
// Past a limit no pins are drawn at all. Only pins on screen are drawn (plus a small edge
// margin so panning doesn't pop).

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number; // height of the visible map, in degrees (0.01° ≈ 1.1 km)
  longitudeDelta: number;
};

// large = icon + count + name, medium = icon only, dot = small coloured dot
export type PinSize = 'large' | 'medium' | 'dot';

// The map opens at 0.01° (about 1.1 km tall), which is the medium size.
export const MAX_LARGE_LATITUDE_DELTA = 0.006; // about 650 m tall
export const MAX_MEDIUM_LATITUDE_DELTA = 0.012; // about 1.3 km
export const MAX_PIN_LATITUDE_DELTA = 0.03; // about 3.3 km; further out, no pins
const EDGE_MARGIN = 0.1; // keep pins up to 10% of the view outside each edge

export function pinSizeFor(region: MapRegion): PinSize | null {
  if (region.latitudeDelta <= MAX_LARGE_LATITUDE_DELTA) return 'large';
  if (region.latitudeDelta <= MAX_MEDIUM_LATITUDE_DELTA) return 'medium';
  if (region.latitudeDelta <= MAX_PIN_LATITUDE_DELTA) return 'dot';
  return null;
}

export function zoomedInEnough(region: MapRegion): boolean {
  return pinSizeFor(region) !== null;
}

export function pinsInView<T extends { latitude: number; longitude: number }>(
  pins: T[],
  region: MapRegion,
): T[] {
  if (!zoomedInEnough(region)) return [];
  const halfLat = (region.latitudeDelta / 2) * (1 + EDGE_MARGIN * 2);
  const halfLng = (region.longitudeDelta / 2) * (1 + EDGE_MARGIN * 2);
  return pins.filter(
    (pin) =>
      Math.abs(pin.latitude - region.latitude) <= halfLat &&
      Math.abs(pin.longitude - region.longitude) <= halfLng,
  );
}
