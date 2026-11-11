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
import { ReservationContactSheet } from '@/components/reservation-contact-sheet';
import {
  addFavourite,
  getFavourites,
  removeFavourite,
} from '@/data/favourites-store';
import {
  getOngoingReservation,
  startReservation,
  updateReservationStatus,
  type ReservationRecord,
} from '@/data/reservation-history-store';
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

  const [contactVisible, setContactVisible] = useState(false);
  const [ongoing, setOngoing] = useState<
    ReservationRecord | undefined
  >(undefined);
  const [reserving, setReserving] = useState(false);

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

  // Refresh favourite and reservation information whenever
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

      getOngoingReservation(id)
        .then((record) => {
          if (active) {
            setOngoing(record);
          }
        })
        .catch(() => {
          if (active) {
            setOngoing(undefined);
          }
        });

      return () => {
        active = false;
      };
    }, [id])
  );

  // Start the reservation process.
  const handleReservation = async () => {
    if (!restaurant || reserving) {
      return;
    }

    setReserving(true);

    try {
      if (restaurant.reservationUrl?.trim()) {
        const url = restaurant.reservationUrl.trim();

        if (!/^https?:\/\//i.test(url)) {
          Alert.alert(
            t('invalidBookingLink'),
            t('invalidBookingDescription')
          );
          return;
        }

        await WebBrowser.openBrowserAsync(url);

        const records = await startReservation(
          restaurant.id,
          'online'
        );

        setOngoing(
          records.find(
            (record) =>
              record.restaurantId === restaurant.id &&
              record.status === 'ongoing'
          )
        );
      } else {
        if (!restaurant.phone?.trim()) {
          Alert.alert(
            t('contactUnavailable'),
            t('noBookingOrPhone')
          );
          return;
        }

        setContactVisible(true);
      }
    } catch {
      Alert.alert(
        t('reservationError'),
        t('somethingWentWrong')
      );
    } finally {
      setReserving(false);
    }
  };

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

  // Update the status of an ongoing reservation.
  const handleStatusUpdate = (
    status: 'completed' | 'cancelled'
  ) => {
    if (!restaurant) {
      return;
    }

    const title =
      status === 'completed'
        ? t('completeReservationQuestion')
        : t('cancelReservationQuestion');

    const message =
      status === 'completed'
        ? t('completeReservationDescription')
        : t('cancelReservationDescription');

    Alert.alert(title, message, [
      {
        text: t('keepOngoing'),
        style: 'cancel',
      },
      {
        text:
          status === 'completed'
            ? t('complete')
            : t('cancelReservation'),
        style:
          status === 'cancelled'
            ? 'destructive'
            : 'default',
        onPress: async () => {
          try {
            await updateReservationStatus(
              restaurant.id,
              status
            );

            setOngoing(undefined);

            Alert.alert(
              status === 'completed'
                ? t('completed')
                : t('cancelled'),
              status === 'completed'
                ? t('reservationActivityMoved')
                : t('reservationActivityCancelled')
            );
          } catch {
            Alert.alert(
              t('updateFailed'),
              t('pleaseTryAgain')
            );
          }
        },
      },
    ]);
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

  const isOnlineBooking = !!restaurant.reservationUrl?.trim();

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
            (isFavourite === null || favouriteBusy) &&
              styles.disabled,
          ]}
          disabled={isFavourite === null || favouriteBusy}
          onPress={() => void handleToggleFavourite()}>
          <Text
            style={[
              styles.favoriteButtonText,
              isFavourite && styles.favoriteButtonTextActive,
            ]}>
            {favouriteBusy
              ? t('savingFavourite')
              : isFavourite
                ? `♥  ${t('savedToFavourites')}`
                : `♡  ${t('addToFavourites')}`}
          </Text>
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

        {/* Ongoing reservation */}
        {ongoing && (
          <View style={styles.ongoingBox}>
            <View style={styles.ongoingHeader}>
              <Text style={styles.ongoingTitle}>
                {t('reservationOngoing')}
              </Text>

              <Text style={styles.ongoingBadge}>
                {t('ongoing')}
              </Text>
            </View>

            <Text style={styles.ongoingDescription}>
              {t('startedUsing')}{' '}
              {ongoing.method === 'online'
                ? t('onlineBooking')
                : t('phoneContact')}
              .{' '}
              {t('updateWhenFinished')}
            </Text>

            <Pressable
              style={styles.completeButton}
              onPress={() =>
                handleStatusUpdate('completed')
              }>
              <Text style={styles.completeText}>
                {t('markCompleted')}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() =>
                handleStatusUpdate('cancelled')
              }>
              <Text style={styles.cancelText}>
                {t('cancelReservation')}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Reservation button */}
      {!ongoing && (
        <Pressable
          style={[
            styles.reserve,
            reserving && styles.disabled,
          ]}
          disabled={reserving}
          onPress={() => void handleReservation()}>
          <Text style={styles.reserveText}>
            {reserving
              ? t('pleaseWait')
              : isOnlineBooking
                ? t('reserveOnline')
                : t('doReserve')}
          </Text>
        </Pressable>
      )}

      {/* Phone reservation contact sheet */}
      <ReservationContactSheet
        restaurant={restaurant}
        visible={contactVisible}
        onClose={() => setContactVisible(false)}
        onContactStarted={async () => {
          const records = await startReservation(
            restaurant.id,
            'phone'
          );

          setOngoing(
            records.find(
              (record) =>
                record.restaurantId === restaurant.id &&
                record.status === 'ongoing'
            )
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'center',
  },
  reserveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  ongoingBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    gap: 10,
  },
  ongoingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ongoingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#14213d',
  },
  ongoingBadge: {
    backgroundColor: '#fff3d9',
    color: '#a66500',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  ongoingDescription: {
    color: '#6b7a8d',
    lineHeight: 20,
  },
  completeButton: {
    backgroundColor: '#1b5fad',
    padding: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  completeText: {
    color: '#fff',
    fontWeight: '700',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c62828',
    alignItems: 'center',
  },
  cancelText: {
    color: '#c62828',
    fontWeight: '700',
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
});
