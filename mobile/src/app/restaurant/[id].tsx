import { Ionicons } from '@expo/vector-icons';
import { DirectionsButton } from '@/components/directions-button';
import { RestaurantTrustCard } from '@/components/restaurant-trust-card';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DishList } from '@/components/dish-list';
import { ReviewSection } from '@/components/review-section';
import {
  addFavourite,
  getFavourites,
  removeFavourite,
} from '@/data/favourites-store';
import type { Restaurant } from '@/data/types';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import { findRestaurant } from '@/logic/restaurant-service';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<
    Restaurant | null | undefined
  >(undefined);

  const [isFavourite, setIsFavourite] = useState<boolean | null>(null);
  const [favouriteBusy, setFavouriteBusy] = useState(false);

  const { profile } = useProfile();
  const { t } = useTranslation();

  // Load the restaurant information.
  useEffect(() => {
    let active = true;

    findRestaurant(id)
      .then((found) => {
        if (active) {
          setRestaurant(found ?? null);
        }
      })
      .catch(() => {
        if (active) {
          setRestaurant(null);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  // Refresh favourite information whenever
  // the restaurant screen becomes active.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      getFavourites()
        .then((records) => {
          if (active) {
            setIsFavourite(
              records.some((record) => record.restaurantId === id)
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
    }, [id])
  );

  // Add or remove this restaurant from Favourites.
  const handleToggleFavourite = async () => {
    if (!restaurant || isFavourite === null || favouriteBusy) {
      return;
    }

    setFavouriteBusy(true);

    try {
      if (isFavourite) {
        await removeFavourite(restaurant.id);
        setIsFavourite(false);
      } else {
        await addFavourite(restaurant.id);
        setIsFavourite(true);
      }
    } catch (error) {
      console.error('Failed to update favourite:', error);

      Alert.alert(
        t('updateFailed'),
        t('pleaseTryAgain')
      );
    } finally {
      setFavouriteBusy(false);
    }
  };

  // Loading state.
  if (restaurant === undefined) {
    return (
      <Text style={styles.message}>
        {t('loading')}
      </Text>
    );
  }

  // Restaurant not found.
  if (restaurant === null) {
    return (
      <Text style={styles.message}>
        {t('restaurantNotFound')}
      </Text>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: restaurant.nameEn,
        }}
      />

      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.name}>
          {restaurant.nameKo}
        </Text>

        <Text style={styles.sub}>
          {restaurant.nameEn} ·{' '}
          {'₩'.repeat(restaurant.priceLevel)} ·{' '}
          {restaurant.address}
        </Text>

        {/* Favourite button */}
        <Pressable
          style={[
            styles.favoriteButton,
            isFavourite && styles.favoriteButtonActive,
            (isFavourite === null || favouriteBusy) && styles.disabled,
          ]}
          disabled={isFavourite === null || favouriteBusy}
          onPress={() => void handleToggleFavourite()}
          accessibilityRole="button"
          accessibilityLabel={
            isFavourite ? t('savedToFavourites') : t('addToFavourites')
          }>
          <View style={styles.favoriteButtonContent}>
            <Ionicons
              name={isFavourite ? 'star' : 'star-outline'}
              size={19}
              color="#e0a000"
            />
            <Text
              style={[
                styles.favoriteButtonText,
                isFavourite && styles.favoriteButtonTextActive,
              ]}>
              {favouriteBusy
                ? t('savingFavourite')
                : isFavourite
                  ? t('savedToFavourites')
                  : t('addToFavourites')}
            </Text>
          </View>
        </Pressable>

        {isFavourite && (
          <Text style={styles.favoriteHint}>
            {t('privateNoteHint')}
          </Text>
        )}

        {/* #46 walking directions in Naver Map or Kakao Map */}
        <DirectionsButton
          to={{ name: restaurant.nameKo, lat: restaurant.lat, lng: restaurant.lng }}
        />

        {restaurant.halalCertified && (
          <Text style={styles.badge}>
            {t('halalCertified')}
          </Text>
        )}

        {/* #8 trust badge and confidence */}
        <RestaurantTrustCard restaurant={restaurant} />

        {/* #47 Kakao places have no menu here, but Kakao's page has photos and the menu */}
        {restaurant.kakaoUrl && (
          <Pressable onPress={() => void WebBrowser.openBrowserAsync(restaurant.kakaoUrl!)}>
            <Text style={styles.kakaoLink}>{t('seeOnKakaoMap')}</Text>
          </Pressable>
        )}
        
        {/* Restaurant menu */}
        <Text style={styles.heading}>
          {t('menu')}
        </Text>

        <DishList
          restaurant={restaurant}
          profile={profile}
          onDishPress={(dish) =>
            router.push({
              pathname: '/order-card',
              params: {
                restaurantId: restaurant.id,
                dishId: dish.id,
              },
            })
          }
        />

        {/* Ingredient origins */}
        <Text style={styles.heading}>
          {t('origin')}
        </Text>

        {restaurant.origin.length === 0 ? (
          <Text style={styles.sub}>
            {t('notCheckedYet')}
          </Text>
        ) : (
          restaurant.origin.map((origin) => (
            <Text key={origin.itemKo}>
              {origin.itemKo}: {origin.country}
            </Text>
          ))
        )}

        {/* #52 reviews after eating */}
        <ReviewSection restaurant={restaurant} />

      </ScrollView>

      {/* #50 the one reservation button: a booking request saved in Supabase
          (date, time, people, dishes). Kakao places are not in our database,
          so they have no booking button. */}
      {restaurant.source !== 'kakao' && (
        <Pressable
          style={styles.reserve}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/reserve-form',
              params: { restaurantId: restaurant.id },
            })
          }>
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.reserveText}>{t('bookingRequestButton')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  favoriteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  root: {
    flex: 1,
    backgroundColor: '#f4f7fa',
  },
  page: {
    padding: 16,
    gap: 8,
    paddingBottom: 125,
  },
  message: {
    padding: 32,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14213d',
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    color: '#14213d',
  },
  sub: {
    color: '#666',
  },
  badge: {
    alignSelf: 'flex-start',
    color: '#2e7d32',
    fontWeight: '600',
  },
  reserve: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#1b5fad',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reserveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  favoriteButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1b5fad',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#fff',
  },
  favoriteButtonActive: {
    backgroundColor: '#e8f0fb',
  },
  favoriteButtonText: {
    color: '#1b5fad',
    fontWeight: '700',
  },
  favoriteButtonTextActive: {
    color: '#1b5fad',
  },
  favoriteHint: {
    color: '#6b7a8d',
    fontSize: 12,
    marginTop: 2,
  },
  kakaoLink: { color: '#1b5fad', fontWeight: '600', marginTop: 12 },
});
