import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MapPin } from '@/logic/map-pins';

type Props = {
  pin: MapPin;
  onClose: () => void;
};

export function RestaurantPreview({ pin, onClose }: Props) {
  return (
    <View style={styles.card}>
      <Pressable
        style={styles.info}
        onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: pin.id } })}>
        <Text style={styles.name}>{pin.name}</Text>
        <Text style={styles.detail}>
          {pin.foodType} · {pin.badgeCount} {pin.badgeCount === 1 ? 'badge' : 'badges'}
        </Text>
        <Text style={styles.more}>Tap for menu and details</Text>
      </Pressable>
      <Pressable
        onPress={onClose}
        hitSlop={8}
        style={styles.closeButton}
        accessibilityLabel="Close preview">
        <Ionicons name="close" size={20} color="#666" />
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f3f7',
  },
  more: { fontSize: 13, color: '#1b5fad', marginTop: 6 },
});