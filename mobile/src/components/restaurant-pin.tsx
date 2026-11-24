import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/hooks/use-translation';
import { MapPin } from '@/logic/map-pins';
import type { PinSize } from '@/logic/map-zoom';

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

// Each size, top to bottom: padding, circle, (large only) a fixed name slot.
// `pointY` is the circle's centre, which the map puts on the restaurant's spot.
const SIZES = {
  large: { padding: 6, circle: 40, icon: 21, border: 2, nameSlot: 20 },
  medium: { padding: 4, circle: 28, icon: 15, border: 2, nameSlot: 0 },
  dot: { padding: 4, circle: 12, icon: 0, border: 2, nameSlot: 0 },
} as const;

export function pinLayout(size: PinSize): { height: number; pointY: number } {
  const s = SIZES[size];
  return {
    height: s.padding + s.circle + s.nameSlot + (s.nameSlot ? 0 : s.padding),
    pointY: s.padding + s.circle / 2,
  };
}

type Props = {
  pin: MapPin;
  selected: boolean;
  size?: PinSize;
};

export function RestaurantPin({ pin, selected, size = 'large' }: Props) {
  const color = FOOD_TYPE_COLOR[pin.foodType];
  const { language } = useTranslation();
  const s = SIZES[size];
  const name = language === 'ko' ? pin.nameKo || pin.name : pin.name || pin.nameKo;

  return (
    // #14 + #4: faded = nothing here fits the user (allergies, or no dish Safe for their diet).
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: s.padding,
          paddingHorizontal: s.padding,
          paddingBottom: s.nameSlot ? 0 : s.padding,
        },
        pin.faded && styles.faded,
      ]}
    >
      {/* circle + count together, so the count sits on the circle even when the name makes the pin wider */}
      <View>
        <View
          style={[
            styles.circle,
            {
              width: s.circle,
              height: s.circle,
              borderRadius: s.circle / 2,
              borderWidth: s.border,
              borderColor: size === 'dot' ? 'white' : color,
              backgroundColor: size === 'dot' ? color : 'white',
            },
            pin.faded && (size === 'dot' ? styles.dotFaded : styles.circleFaded),
            selected && styles.circleSelected,
          ]}
        >
          {s.icon > 0 && (
            <Ionicons name={FOOD_TYPE_VECTOR_ICON[pin.foodType]} size={s.icon} color={color} />
          )}
        </View>

        {size === 'large' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pin.badgeCount}</Text>
          </View>
        )}
      </View>

      {size === 'large' && (
        // always the same height, so the map's anchor point never moves
        <View style={[styles.nameSlot, { height: s.nameSlot }]}>
          {name ? (
            <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
              {name}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  faded: { opacity: 0.35 },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFaded: { borderColor: '#9aa8b8' },
  dotFaded: { backgroundColor: '#9aa8b8' },
  circleSelected: { borderColor: '#d84315', borderWidth: 3 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#d84315',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  nameSlot: { justifyContent: 'center' },
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
