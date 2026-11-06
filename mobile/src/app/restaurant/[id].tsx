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

import { ReservationContactSheet } from '@/components/reservation-contact-sheet';
import type {
  Dish,
  DishStatus,
  Restaurant,
} from '@/data/types';
import {
  getOngoingReservation,
  startReservation,
  updateReservationStatus,
  type ReservationRecord,
} from '@/data/reservation-history-store';
import { useProfile } from '@/hooks/use-profile';
import { dishStatus } from '@/logic/profile-filter';
import { findRestaurant } from '@/logic/restaurant-service';

const STATUS: Record<
  DishStatus,
  { label: string; color: string }
> = {
  safe: { label: 'Safe', color: '#2e7d32' },
  ask_first: { label: 'Ask first', color: '#ef6c00' },
  avoid: { label: 'Avoid', color: '#c62828' },
};

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>();
  const [contactVisible, setContactVisible] = useState(false);
  const [ongoing, setOngoing] = useState<ReservationRecord | undefined>();
  const [reserving, setReserving] = useState(false);

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

      getOngoingReservation(id).then((record) => {
        if (active) {
          setOngoing(record);
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

        {restaurant.halalCertified && (
          <Text style={styles.badge}>Halal certified</Text>
        )}

        <Text style={styles.heading}>Menu</Text>

        {restaurant.dishes.length === 0 && (
          <Text style={styles.sub}>
            Menu not added yet. Ask staff before ordering.
          </Text>
        )}

        {restaurant.dishes.map((dish) => (
          <DishRow
            key={dish.id}
            dish={dish}
            status={dishStatus(dish, restaurant, profile)}
            onPress={() =>
              router.push({
                pathname: '/order-card',
                params: {
                  restaurantId: restaurant.id,
                  dishId: dish.id,
                },
              })
            }
          />
        ))}

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

function DishRow({
  dish,
  status,
  onPress,
}: {
  dish: Dish;
  status: DishStatus;
  onPress: () => void;
}) {
  const statusInfo = STATUS[status];

  return (
    <Pressable style={styles.dish} onPress={onPress}>
      <View style={styles.dishTop}>
        <Text style={styles.dishName}>
          {dish.nameKo} · ₩{dish.priceWon.toLocaleString()}
        </Text>

        <Text
          style={[
            styles.status,
            {
              color: statusInfo.color,
              borderColor: statusInfo.color,
            },
          ]}>
          {statusInfo.label}
        </Text>
      </View>

      <Text style={styles.sub}>{dish.nameEn}</Text>

      <Text style={styles.small}>
        Contains: {dish.contains.join(', ') || 'nothing listed'}
        {dish.mayContain.length > 0
          ? ` · May contain: ${dish.mayContain.join(', ')}`
          : ''}
      </Text>

      {status !== 'safe' && dish.leaveOutEn && (
        <Text style={styles.small}>
          Ask: {dish.leaveOutEn}
        </Text>
      )}
    </Pressable>
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
  small: {
    fontSize: 12,
    color: '#666',
  },
  badge: {
    alignSelf: 'flex-start',
    color: '#2e7d32',
    fontWeight: '600',
  },
  dish: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 2,
  },
  dishTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dishName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
    color: '#14213d',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
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
});