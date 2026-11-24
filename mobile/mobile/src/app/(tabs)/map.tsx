import { pinLayout, RestaurantPin } from '@/components/restaurant-pin';
import { RestaurantPreview } from '@/components/restaurant-preview';
import { useLiveLocation } from '@/hooks/use-live-location';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import { getMapPins, type MapPin } from '@/logic/map-pins';
import { pinSizeFor, pinsInView, zoomedInEnough, type MapRegion } from '@/logic/map-zoom';
import { distanceInMeters, ERICA_CENTRE, type Point } from '@/logic/nearby-service';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ERICA_REGION = {
  latitude: 37.2967,
  longitude: 126.836,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const SEARCH_BAR_HEIGHT = 48;
const EDGE_GAP = 12;

export default function MapScreen() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  // #46: only watch GPS while the map tab is on screen (saves battery).
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  const me = useLiveLocation(focused);
  // #47: pins load around `centre`; `mapCentre` is where the map is now.
  const [centre, setCentre] = useState<Point>(ERICA_CENTRE);
  const [mapCentre, setMapCentre] = useState<Point>(ERICA_CENTRE);
  // Zoomed out too far, the pins pile on top of each other, so we draw none (see map-zoom.ts).
  const [region, setRegion] = useState<MapRegion>(ERICA_REGION);
  const zoomedIn = zoomedInEnough(region);
  const zoomSize = pinSizeFor(region) ?? 'dot'; // smaller pins the further out you zoom
  const visiblePins = useMemo(() => {
    const shown = pinsInView(pins, region);
    // keep the selected pin even if it just left the view
    if (selectedPin && !shown.some((pin) => pin.id === selectedPin.id)) shown.push(selectedPin);
    return shown;
  }, [pins, region, selectedPin]);
  const movedToMe = useRef(false);

  // The first time we know where the user is, load and show pins there.
  useEffect(() => {
    if (!me || movedToMe.current) return;
    movedToMe.current = true;
    setCentre(me);
    mapRef.current?.animateToRegion(
      { latitude: me.lat, longitude: me.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500
    );
  }, [me]);

  const goToMe = () => {
    if (!me) return;
    mapRef.current?.animateToRegion(
      {
        latitude: me.lat,
        longitude: me.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  };  

  // #4: an older, slower request must not overwrite newer pins
  // (e.g. Halal toggled on and off quickly), so only the latest request may set state.
  useEffect(() => {
    let active = true;
    getMapPins(profile, centre)
      .then((next) => {
        if (!active) return;
        setPins(next);
        setSelectedPin((previous) =>
          previous
            ? next.find((pin) => pin.id === previous.id) ?? null
            : null
        );
      })
      .catch((error) => {
        if (active) console.error('Failed to load map pins:', error);
      });
    return () => {
      active = false;
    };
  }, [profile, centre]);

  const showSearchHere = zoomedIn && !selectedPin && distanceInMeters(mapCentre, centre) > 300;

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={ERICA_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={(next) => {
          setRegion(next);
          setMapCentre({ lat: next.latitude, lng: next.longitude });
        }}>
        {visiblePins.map((pin) => {
          const selected = selectedPin?.id === pin.id;
          const size = selected ? 'large' : zoomSize; // the tapped pin is always full size, with its name
          const layout = pinLayout(size);
          return (
            <Marker
              // Android only redraws a custom marker when its key changes
              key={`${pin.id}-${pin.faded ? 'faded' : 'normal'}-${size}-${selected ? 'sel' : ''}`}
              coordinate={{
                latitude: pin.latitude,
                longitude: pin.longitude,
              }}
              // put the circle's centre (not the whole view) on the spot, so pins don't jump between sizes
              anchor={{ x: 0.5, y: layout.pointY / layout.height }} // Android
              centerOffset={{ x: 0, y: layout.height / 2 - layout.pointY }} // iOS
              onPress={() => setSelectedPin(pin)}>
              <RestaurantPin pin={pin} selected={selected} size={size} />
            </Marker>
          );
        })}
      </MapView>

      <Pressable
        style={[styles.searchBar, { top: insets.top + EDGE_GAP }]}
        onPress={() => router.push('/search')}
        accessibilityRole="button"
        accessibilityLabel={t('searchRestaurantsOrFood')}>
        <Ionicons name="search" size={20} color="#8a94a3" />
        <Text style={styles.searchText}>
          {t('searchRestaurantsOrFood')}
        </Text>
      </Pressable>

      {!zoomedIn && !selectedPin && (
        <View
          pointerEvents="none"
          style={[styles.searchHereWrap, { top: insets.top + EDGE_GAP + SEARCH_BAR_HEIGHT + 8 }]}>
          <View style={styles.searchHere}>
            <Ionicons name="search-outline" size={16} color="#1b5fad" />
            <Text style={styles.searchHereText}>{t('zoomInToSeeRestaurants')}</Text>
          </View>
        </View>
      )}

      {showSearchHere && (
        <View
          pointerEvents="box-none"
          style={[styles.searchHereWrap, { top: insets.top + EDGE_GAP + SEARCH_BAR_HEIGHT + 8 }]}>
          <Pressable
            style={styles.searchHere}
            onPress={() => setCentre(mapCentre)}
            accessibilityRole="button">
            <Ionicons name="refresh" size={16} color="#1b5fad" />
            <Text style={styles.searchHereText}>{t('searchThisArea')}</Text>
          </Pressable>
        </View>
      )}

      {selectedPin && (
        <View
          style={[
            styles.previewArea,
            {
              top:
                insets.top +
                EDGE_GAP +
                SEARCH_BAR_HEIGHT +
                8,
            },
          ]}>
          <RestaurantPreview
            key={selectedPin.id}
            pin={selectedPin}
            from={me}
            onClose={() => setSelectedPin(null)}
          />
        </View>
      )}
      {me && (
        <Pressable
          style={styles.locateButton}
          onPress={goToMe}
          accessibilityRole="button"
          accessibilityLabel={t('myLocation')}>
          <Ionicons name="locate" size={22} color="#1b5fad" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  previewArea: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  searchBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: SEARCH_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  searchText: {
    color: '#8a94a3',
    fontSize: 15,
  },
  locateButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  searchHereWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  searchHere: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchHereText: { color: '#1b5fad', fontWeight: '600' },

});
