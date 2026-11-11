
import { DirectionsButton } from '@/components/directions-button';
import type { FoodType } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import type { MapPin } from '@/logic/map-pins';
import { distanceInMeters, walkMinutes, type Point } from '@/logic/nearby-service';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const FOOD_TYPE_KEYS: Record<
  FoodType,
  'koreanFood' | 'chicken' | 'noodles' | 'cafe' | 'halal' | 'other'
> = {
  korean: 'koreanFood',
  chicken: 'chicken',
  noodles: 'noodles',
  cafe: 'cafe',
  halal: 'halal',
  other: 'other',
};

type Props = {
  pin: MapPin;
  from: Point | null; // #46: the user's live location, if we have it
  onClose: () => void;
};

export function RestaurantPreview({ pin, onClose }: Props) {
  const { t } = useTranslation();
  const to = { name: pin.name, lat: pin.latitude, lng: pin.longitude };
  const meters = from ? distanceInMeters(from, to) : null;
  return (
    <View style={styles.card}>
      <Pressable
        style={styles.info}
        onPress={() =>
          router.push({
            pathname: '/restaurant/[id]',
            params: { id: pin.id },
          })
        }>
        <Text style={styles.name}>{pin.name}</Text>

        <Text style={styles.detail}>
          {t(FOOD_TYPE_KEYS[pin.foodType])} ·{' '}
          {t('badgeCount', { count: pin.badgeCount })}
        </Text>

        {pin.faded && (
          <Text style={styles.warning}>
            {t('noAllergenFreeDish')}
          </Text>
        )}

        {meters !== null && (
          <Text style={styles.detail}>
            {formatDistance(meters)} ·{' '}
            {t('walkTime', { minutes: walkMinutes(meters) })}
          </Text>
        )}

        <DirectionsButton to={to} />

        <Text style={styles.more}>{t('tapForDetails')}</Text>
      </Pressable>

      <Pressable
        onPress={onClose}
        hitSlop={8}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel={t('closePreview')}>
        <Ionicons name="close" size={20} color="#666" />
      </Pressable>
    </View>
  );
}

function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
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
  warning: {
    fontSize: 13,
    color: '#c62828',
    fontWeight: '600',
    marginTop: 4,
  },
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
