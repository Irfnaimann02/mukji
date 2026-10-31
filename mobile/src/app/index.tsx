import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RestaurantPin } from '@/components/restaurant-pin';
import { RestaurantPreview } from '@/components/restaurant-preview';
import { getMapPins, MapPin } from '@/logic/map-pins';

const ERICA_REGION = {
  latitude: 37.2967,
  longitude: 126.836,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const PINS = getMapPins();

export default function MapScreen() {
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <MapView style={styles.map} initialRegion={ERICA_REGION}>
        {PINS.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            onPress={() => setSelectedPin(pin)}>
            <RestaurantPin pin={pin} selected={selectedPin?.id === pin.id} />
          </Marker>
        ))}
      </MapView>

      {selectedPin && (
        <View style={[styles.previewArea, { top: insets.top + 12 }]}>
          <RestaurantPreview pin={selectedPin} onClose={() => setSelectedPin(null)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { flex: 1 },
  previewArea: { position: 'absolute', left: 16, right: 16 },
});