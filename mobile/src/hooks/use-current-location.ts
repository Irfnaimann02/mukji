import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { distanceInMeters, ERICA_CENTRE, type Point } from '@/logic/nearby-service';

// Mukji only covers the area around campus. Anyone further away
// sees the list as if they stood in the middle of campus.
const MAX_FROM_CAMPUS_M = 5000;

export type CurrentLocation = {
  point: Point;
  isGps: boolean;
  ready: boolean;
};

export function useCurrentLocation(): CurrentLocation {
  const [state, setState] = useState<CurrentLocation>({
    point: ERICA_CENTRE,
    isGps: false,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('Location permission denied');

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        const nearCampus = distanceInMeters(point, ERICA_CENTRE) <= MAX_FROM_CAMPUS_M;

        if (!cancelled) {
          setState({ point: nearCampus ? point : ERICA_CENTRE, isGps: nearCampus, ready: true });
        }
      } catch {
        if (!cancelled) setState({ point: ERICA_CENTRE, isGps: false, ready: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}