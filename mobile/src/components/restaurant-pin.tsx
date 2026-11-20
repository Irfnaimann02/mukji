
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MapPin } from '@/logic/map-pins';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const FOOD_TYPE_ICON: Record<MapPin['foodType'], string> = {
  korean: '🍚',
  chicken: '🍗',
  noodles: '🍜',
  cafe: '☕',
  halal: '🥙',
  other: '🍽️',
};

const FOOD_TYPE_VECTOR_ICON: Record<MapPin['foodType'], IconName> = {
  korean: 'restaurant-outline',
  chicken: 'fast-food-outline',
  noodles: 'egg-outline',
  cafe: 'cafe-outline',
  halal: 'moon-outline',
  other: 'grid-outline',
};

const FOOD_TYPE_COLOR: Record<MapPin['foodType'], string> = {
  korean: '#D97706',
  chicken: '#EA580C',
  noodles: '#7C3AED',
  cafe: '#92400E',
  halal: '#059669',
  other: '#64748B',
};

type Props = {
  pin: MapPin;
  selected: boolean;
};

export function RestaurantPin({ pin, selected }: Props) {
  const color = FOOD_TYPE_COLOR[pin.foodType];

  return (
    // #14 + #4: faded = nothing here fits the user (allergies, or no dish Safe for their diet).
    <View style={[styles.wrapper, pin.faded && styles.faded]}>
      <View
        style={[
          styles.circle,
          { borderColor: color },
          pin.faded && styles.circleFaded,
          selected && styles.circleSelected,
        ]}>
        <Ionicons
          name={FOOD_TYPE_VECTOR_ICON[pin.foodType]}
          size={21}
          color={color}
        />
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{pin.badgeCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { padding: 6 },
  faded: { opacity: 0.35 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFaded: { borderColor: '#9aa8b8' },
  circleSelected: { borderColor: '#d84315', borderWidth: 3 },
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
