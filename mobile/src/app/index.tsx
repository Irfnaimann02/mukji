import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { getMapPins } from '@/logic/map-pins';

const ERICA_REGION = {
  latitude: 37.2967,
  longitude: 126.836,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const PINS = getMapPins();

export default function MapScreen() {
  return (
    <MapView style={styles.map} initialRegion={ERICA_REGION}>
      {PINS.map((pin) => (
        <Marker
          key={pin.id}
          coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
          title={pin.name}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});