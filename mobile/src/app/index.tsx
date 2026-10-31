import { StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

const ERICA_REGION = {
  latitude: 37.2967,
  longitude: 126.836,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function MapScreen() {
  return <MapView style={styles.map} initialRegion=
{ERICA_REGION} />;
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});

