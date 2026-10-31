import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MapPin } from '@/logic/map-pins';

type Props = {
  pin: MapPin;
  onClose: () => void;
};

export function RestaurantPreview({ pin, onClose }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{pin.name}</Text>
        <Text style={styles.detail}>
          {pin.foodType} · {pin.badgeCount} {pin.badgeCount === 1 ? 'badge' : 'badges'}
        </Text>
      </View>
      <Pressable onPress={onClose} hitSlop={12}>
        <Text style={styles.close}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: 'bold', color: '#222' },
  detail: { fontSize: 14, color: '#666', marginTop: 4 },
  close: { fontSize: 18, color: '#666' },
});