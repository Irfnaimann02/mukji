
import { DirectionsButton } from '@/components/directions-button';
import {
  addFavourite,
  getFavourites,
  removeFavourite,
} from '@/data/favourites-store';
import type { FoodType } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import type { MapPin } from '@/logic/map-pins';
import { distanceInMeters, walkMinutes, type Point } from '@/logic/nearby-service';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  from: Point | null;
  onClose: () => void;
};

export function RestaurantPreview({ pin, from, onClose }: Props) {
  const { t } = useTranslation();
  const [isFavourite, setIsFavourite] = useState<boolean | null>(null);
  const [favouriteBusy, setFavouriteBusy] = useState(false);

  const to = { name: pin.name, lat: pin.latitude, lng: pin.longitude };
  const meters = from ? distanceInMeters(from, to) : null;

  // Refresh the saved status whenever the map preview becomes active.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      getFavourites()
        .then((records) => {
          if (active) {
            setIsFavourite(
              records.some((record) => record.restaurantId === pin.id)
            );
          }
        })
        .catch((error) => {
          console.error('Failed to load favourite status:', error);

          if (active) {
            setIsFavourite(false);
          }
        });

      return () => {
        active = false;
      };
    }, [pin.id])
  );

  const handleToggleFavourite = async () => {
    if (isFavourite === null || favouriteBusy) return;

    setFavouriteBusy(true);

    try {
      if (isFavourite) {
        await removeFavourite(pin.id);
        setIsFavourite(false);
      } else {
        await addFavourite(pin.id);
        setIsFavourite(true);
      }
    } catch (error) {
      console.error('Failed to update favourite:', error);
      Alert.alert(t('updateFailed'), t('pleaseTryAgain'));
    } finally {
      setFavouriteBusy(false);
    }
  };

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
        style={styles.starButton}
        disabled={isFavourite === null || favouriteBusy}
        onPress={() => void handleToggleFavourite()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          isFavourite ? t('savedToFavourites') : t('addToFavourites')
        }>
        <Ionicons
          name={isFavourite ? 'star' : 'star-outline'}
          size={22}
          color={isFavourite ? '#e0a000' : '#6b7a8d'}
        />
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
  starButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f3f7',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f3f7',
  },
  more: { fontSize: 13, color: '#1b5fad', marginTop: 6 },
});
