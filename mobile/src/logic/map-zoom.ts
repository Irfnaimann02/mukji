// Search map: only draw pins when the map is zoomed in enough to read them,
// and only the ones on screen (plus a small edge margin so panning doesn't pop).

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number; // height of the visible map, in degrees
  longitudeDelta: number;
};

// 0.02° of latitude is about 2.2 km top to bottom. The map opens at 0.01°.
export const MAX_PIN_LATITUDE_DELTA = 0.02;
const EDGE_MARGIN = 0.1; // keep pins up to 10% of the view outside each edge

// Names under the pins only from the opening zoom (about 1.1 km tall) inward,
// so the map isn't a wall of overlapping labels.
export const MAX_NAME_LATITUDE_DELTA = 0.01;

export function showPinNames(region: MapRegion): boolean {
  return region.latitudeDelta <= MAX_NAME_LATITUDE_DELTA;
}

export function zoomedInEnough(region: MapRegion): boolean {
  return region.latitudeDelta <= MAX_PIN_LATITUDE_DELTA;
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
