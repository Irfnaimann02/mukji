import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Point } from '@/logic/nearby-service';

// #46: follows the user while the map is open.
// null = no permission yet, permission denied, or no GPS fix yet.
export function useLiveLocation(active: boolean = true): Point | null {
  const [point, setPoint] = useState<Point | null>(null);

  useEffect(() => {
    if (!active) return; // stop watching GPS while the map tab is hidden
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
        (position) =>
          setPoint({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
      );

      // The screen may have closed while we waited for GPS.
      if (cancelled) sub.remove();
      else subscription = sub;
    })().catch(() => setPoint(null));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [active]);

  return point;
}