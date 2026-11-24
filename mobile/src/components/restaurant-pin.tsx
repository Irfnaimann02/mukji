
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/hooks/use-translation';
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
  showName?: boolean; // the name under the pin, so people know the place before tapping
};

// Pin layout, top to bottom: 6 padding, 40 circle, 20 name slot = 66.
// The map puts the circle's centre (y = 26) on the restaurant's spot.
const PIN_NAME_HEIGHT = 20;
export const PIN_HEIGHT = 6 + 40 + PIN_NAME_HEIGHT;
export const PIN_POINT_Y = 6 + 20;

export function RestaurantPin({ pin, selected, showName = false }: Props) {
  const color = FOOD_TYPE_COLOR[pin.foodType];
  const { language } = useTranslation();
  const name = language === 'ko' ? pin.nameKo || pin.name : pin.name || pin.nameKo;

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

      {/* always the same height, so the map's anchor point never moves */}
      <View style={styles.nameSlot}>
        {(showName || selected) && name ? (
          <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
            {name}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingTop: 6, paddingHorizontal: 6, alignItems: 'center' },
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
  nameSlot: { height: PIN_NAME_HEIGHT, justifyContent: 'center' },
  name: {
    maxWidth: 96,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.92)',
    color: '#14213d',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameSelected: { color: '#d84315' },
});
