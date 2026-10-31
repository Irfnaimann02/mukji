import { StyleSheet, Text, View } from 'react-native';

import { MapPin } from '@/logic/map-pins';

export const FOOD_TYPE_ICON: Record<MapPin['foodType'], string> = {
  korean: '🍚',
  chicken: '🍗',
  noodles: '🍜',
  cafe: '☕',
  halal: '🥙',
  other: '🍽️',
};

type Props = {
  pin: MapPin;
  selected: boolean;
};

export function RestaurantPin({ pin, selected }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.circle, selected && styles.circleSelected]}>
        <Text style={styles.icon}>{FOOD_TYPE_ICON[pin.foodType]}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{pin.badgeCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { padding: 6 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSelected: { borderColor: '#d84315', borderWidth: 3 },
  icon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#d84315',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
});