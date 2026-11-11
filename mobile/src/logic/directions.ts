import { Linking } from 'react-native';

import type { Point } from '@/logic/nearby-service';

export type MapApp = 'naver' | 'kakao';

export type Destination = Point & { name: string };

// Naver asks for an app name; it is only used for their stats.
const NAVER_APP_NAME = 'com.mukji.app';

// #46: no start point, so both apps start from where the user is now.
export function directionsUrl(app: MapApp, to: Destination): string {
  if (app === 'naver') {
    return (
      `nmap://route/walk?dlat=${to.lat}&dlng=${to.lng}` +
      `&dname=${encodeURIComponent(to.name)}&appname=${NAVER_APP_NAME}`
    );
  }
  return `kakaomap://route?ep=${to.lat},${to.lng}&by=FOOT`;
}

// Opens in any browser, so it is the fallback when no map app is installed.
export function webDirectionsUrl(to: Destination): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(to.name)},${to.lat},${to.lng}`;
}

export async function openDirections(app: MapApp, to: Destination): Promise<void> {
  try {
    await Linking.openURL(directionsUrl(app, to));
  } catch {
    // The app is not installed: openURL fails, so use the web page.
    await Linking.openURL(webDirectionsUrl(to));
  }
}