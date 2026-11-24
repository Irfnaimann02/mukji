// Map maths shared by the restaurant and nearby services.

export type Point = { lat: number; lng: number };

// Straight-line distance in metres (haversine formula).
export function distanceInMeters(a: Point, b: Point): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Only the places within radiusM of the centre: a square search area keeps its
// corners, which are up to about 40% further away than the radius.
export function withinRadius<T extends Point>(places: T[], centre: Point, radiusM: number): T[] {
  return places.filter((place) => distanceInMeters(centre, place) <= radiusM);
}
