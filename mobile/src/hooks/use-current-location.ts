import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { ERICA_CENTRE, type Point } from '@/logic/nearby-service';

// #47: works anywhere in Korea. Without permission, the list starts from campus.

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

        if (!cancelled) {
          setState({ point, isGps: true, ready: true });
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