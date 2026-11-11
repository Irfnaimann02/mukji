import { RestaurantPin } from '@/components/restaurant-pin';
import { RestaurantPreview } from '@/components/restaurant-preview';
import { useLiveLocation } from '@/hooks/use-live-location';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import { getMapPins, type MapPin } from '@/logic/map-pins';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
  const me = useLiveLocation(); // #46

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

  useEffect(() => {
    getMapPins(profile)
      .then((next) => {
        setPins(next);
        setSelectedPin((previous) =>
          previous
            ? next.find((pin) => pin.id === previous.id) ?? null
            : null
        );
      })
      .catch((error) => {
        console.error('Failed to load map pins:', error);
      });
  }, [profile]);

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={ERICA_REGION}
        showsUserLocation
        showsMyLocationButton={false}>
        {pins.map((pin) => (
          <Marker
            key={`${pin.id}-${pin.faded ? 'faded' : 'normal'}`}
            coordinate={{
              latitude: pin.latitude,
              longitude: pin.longitude,
            }}
            onPress={() => setSelectedPin(pin)}>
            <RestaurantPin
              pin={pin}
              selected={selectedPin?.id === pin.id}
            />
          </Marker>
        ))}
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
});
