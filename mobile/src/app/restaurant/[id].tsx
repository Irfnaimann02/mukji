import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { DishList } from '@/components/dish-list';
import {
  addFavourite,
  getFavourites,
  removeFavourite,
} from '@/data/favourites-store';
import { ReservationContactSheet } from '@/components/reservation-contact-sheet';
import type { Restaurant } from '@/data/types';
import {
  startReservation,
  updateReservationStatus,
  type ReservationRecord,
} from '@/data/reservation-history-store';
import { useProfile } from '@/hooks/use-profile';
import { findRestaurant } from '@/logic/restaurant-service';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>();
  const [contactVisible, setContactVisible] = useState(false);
  const [ongoing, setOngoing] = useState<ReservationRecord | undefined>();
  const [reserving, setReserving] = useState(false);
  const [isFavourite, setIsFavourite] = useState<boolean | null>(null);
  const [favouriteBusy, setFavouriteBusy] = useState(false);

  const { profile } = useProfile();

  useEffect(() => {
    let active = true;

    findRestaurant(id)
      .then((found) => {
        if (active) setRestaurant(found ?? null);
      })
      .catch(() => {
        if (active) setRestaurant(null);
      });

    return () => {
      active = false;
    };
  }, [id]);

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

  const handleReservation = async () => {
    if (!restaurant || reserving) return;

    setReserving(true);

    try {
      if (restaurant.reservationUrl?.trim()) {
        const url = restaurant.reservationUrl.trim();

        // Only open valid HTTP or HTTPS booking links.
        if (!/^https?:\/\//i.test(url)) {
          Alert.alert(
            'Invalid booking link',
            'The online reservation link is not valid. Please contact the restaurant directly.'
          );
          return;
        }

        await WebBrowser.openBrowserAsync(url);

        const records = await startReservation(restaurant.id, 'online');

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
            'Contact unavailable',
            'This restaurant has no online booking link or phone number yet.'
          );
          return;
        }

        setContactVisible(true);
      }
    } catch {
      Alert.alert(
        'Reservation error',
        'Something went wrong. Please try again.'
      );
    } finally {
      setReserving(false);
    }
  };

  const handleToggleFavourite = async () => {
    if (!restaurant || isFavourite === null || favouriteBusy) return;

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
        'Favourites update failed',
        'Please try again.'
      );
    } finally {
      setFavouriteBusy(false);
    }
  };

  const handleStatusUpdate = (status: 'completed' | 'cancelled') => {
    if (!restaurant) return;

    const title =
      status === 'completed'
        ? 'Complete reservation?'
        : 'Cancel reservation?';

    const message =
      status === 'completed'
        ? 'Have you finished contacting or booking this restaurant?'
        : 'Are you sure you want to cancel this ongoing reservation?';

    Alert.alert(title, message, [
      {
        text: 'Keep ongoing',
        style: 'cancel',
      },
      {
        text: status === 'completed' ? 'Complete' : 'Cancel reservation',
        style: status === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await updateReservationStatus(restaurant.id, status);
            setOngoing(undefined);

            Alert.alert(
              status === 'completed' ? 'Completed' : 'Cancelled',
              status === 'completed'
                ? 'Your reservation activity has been moved to History.'
                : 'Your reservation activity has been cancelled.'
            );
          } catch {
            Alert.alert(
              'Update failed',
              'Please try again.'
            );
          }
        },
      },
    ]);
  };

  if (restaurant === undefined) {
    return <Text style={styles.message}>Loading...</Text>;
  }

  if (restaurant === null) {
    return <Text style={styles.message}>Restaurant not found.</Text>;
  }

  const isOnlineBooking = !!restaurant.reservationUrl?.trim();

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f7fa' }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: restaurant.nameEn,
        }}
      />

      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.name}>{restaurant.nameKo}</Text>

        <Text style={styles.sub}>
          {restaurant.nameEn} · {'₩'.repeat(restaurant.priceLevel)} ·{' '}
          {restaurant.address}
        </Text>

        <Pressable
          style={[
            styles.favoriteButton,
            isFavourite && styles.favoriteButtonActive,
            (isFavourite === null || favouriteBusy) && styles.disabled,
          ]}
          disabled={isFavourite === null || favouriteBusy}
          onPress={() => void handleToggleFavourite()}>
          <Text
            style={[
              styles.favoriteButtonText,
              isFavourite && styles.favoriteButtonTextActive,
            ]}>
            {favouriteBusy
              ? 'Please wait...'
              : isFavourite
                ? '♥  Saved to Favourites'
                : '♡  Add to Favourites'}
          </Text>
        </Pressable>

        {isFavourite && (
          <Text style={styles.favoriteHint}>
            You can add or edit your private note in the Favourites tab.
          </Text>
        )}

        {restaurant.halalCertified && (
          <Text style={styles.badge}>Halal certified</Text>
        )}

        <Text style={styles.heading}>Menu</Text>

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

        <Text style={styles.heading}>원산지 (origin)</Text>

        {restaurant.origin.length === 0 ? (
          <Text style={styles.sub}>Not checked yet</Text>
        ) : (
          restaurant.origin.map((origin) => (
            <Text key={origin.itemKo}>
              {origin.itemKo}: {origin.country}
            </Text>
          ))
        )}

        {/* Ongoing reservation status */}
        {ongoing && (
          <View style={styles.ongoingBox}>
            <View style={styles.ongoingHeader}>
              <Text style={styles.ongoingTitle}>
                Reservation Ongoing
              </Text>

              <Text style={styles.ongoingBadge}>Ongoing</Text>
            </View>

            <Text style={styles.ongoingDescription}>
              Started using{' '}
              {ongoing.method === 'online'
                ? 'online booking'
                : 'phone contact'}
              .
              {'\n'}
              Update the status when you finish.
            </Text>

            <Pressable
              style={styles.completeButton}
              onPress={() => handleStatusUpdate('completed')}>
              <Text style={styles.completeText}>
                Mark as completed
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => handleStatusUpdate('cancelled')}>
              <Text style={styles.cancelText}>
                Cancel reservation
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

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
              ? 'Please wait...'
              : isOnlineBooking
                ? 'Reserve online'
                : 'Do reservation'}
          </Text>
        </Pressable>
      )}

      <ReservationContactSheet
        restaurant={restaurant}
        visible={contactVisible}
        onClose={() => setContactVisible(false)}
        onContactStarted={async () => {
          const records = await startReservation(restaurant.id, 'phone');

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