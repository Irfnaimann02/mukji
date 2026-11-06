import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Restaurant } from '@/data/types';
import {
  getReservationRecords,
  type ReservationRecord,
} from '@/data/reservation-history-store';
import { listRestaurants } from '@/logic/restaurant-service';

type ScreenMode = 'ongoing' | 'history' | 'pick';

const BLUE = '#1b5fad';
const GREY = '#8a94a3';

export default function ReserveScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<ScreenMode>('ongoing');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [records, setRecords] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const [restaurantList, reservationRecords] = await Promise.all([
        listRestaurants(),
        getReservationRecords(),
      ]);

      setRestaurants(restaurantList);
      setRecords(reservationRecords);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const ongoingRecords = records.filter(
    (record) => record.status === 'ongoing'
  );

  const historyRecords = records.filter(
    (record) => record.status !== 'ongoing'
  );

  const findRestaurant = (id: string) =>
    restaurants.find((restaurant) => restaurant.id === id);

  const openRestaurant = (restaurant: Restaurant) => {
    router.push({
      pathname: '/restaurant/[id]',
      params: { id: restaurant.id },
    });
  };

  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <Pressable
      style={styles.restaurantCard}
      onPress={() => openRestaurant(item)}>
      <View style={styles.restaurantIcon}>
        <Ionicons name="restaurant-outline" size={24} color={BLUE} />
      </View>

      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.nameEn}</Text>
        <Text style={styles.restaurantKorean}>{item.nameKo}</Text>
        <Text style={styles.restaurantAddress} numberOfLines={2}>
          {item.address}
        </Text>

        <Text style={styles.restaurantAction}>
          View restaurant details
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={GREY} />
    </Pressable>
  );

  const renderHistory = (record: ReservationRecord) => {
    const restaurant = findRestaurant(record.restaurantId);

    if (!restaurant) return null;

    const completed = record.status === 'completed';

    return (
      <Pressable
        key={`${record.restaurantId}-${record.startedAt}`}
        style={styles.historyCard}
        onPress={() => openRestaurant(restaurant)}>
        <View style={styles.historyTop}>
          <Text style={styles.restaurantName}>
            {restaurant.nameEn}
          </Text>

          <View
            style={[
              styles.statusBadge,
              completed ? styles.completedBadge : styles.cancelledBadge,
            ]}>
            <Text
              style={[
                styles.statusText,
                completed ? styles.completedText : styles.cancelledText,
              ]}>
              {completed ? 'Completed' : 'Cancelled'}
            </Text>
          </View>
        </View>

        <Text style={styles.restaurantKorean}>
          {restaurant.nameKo}
        </Text>

        <Text style={styles.historyDate}>
          Started: {new Date(record.startedAt).toLocaleString()}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Reservation</Text>
        <Text style={styles.subtitle}>
          Manage your restaurant reservation activity.
        </Text>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setMode('ongoing')}
          style={[styles.tab, mode === 'ongoing' && styles.activeTab]}>
          <Text
            style={[
              styles.tabText,
              mode === 'ongoing' && styles.activeTabText,
            ]}>
            Ongoing
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('history')}
          style={[styles.tab, mode === 'history' && styles.activeTab]}>
          <Text
            style={[
              styles.tabText,
              mode === 'history' && styles.activeTabText,
            ]}>
            History
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={42} color={GREY} />
          <Text style={styles.emptyTitle}>
            Could not load reservations.
          </Text>
          <Pressable onPress={() => void refresh()} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : mode === 'pick' ? (
        <View style={styles.flex}>
          <View style={styles.pickHeader}>
            <Pressable
              onPress={() => setMode('ongoing')}
              hitSlop={10}>
              <Ionicons name="arrow-back" size={23} color={BLUE} />
            </Pressable>

            <View style={styles.flex}>
              <Text style={styles.pickTitle}>Choose a restaurant</Text>
              <Text style={styles.subtitle}>
                Select a restaurant to view its details and reservation options.
              </Text>
            </View>
          </View>

          <FlatList
            data={restaurants}
            keyExtractor={(item) => item.id}
            renderItem={renderRestaurant}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No restaurants are available yet.
              </Text>
            }
          />
        </View>
      ) : mode === 'ongoing' ? (
        <View style={styles.flex}>
          {ongoingRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={54}
                  color={BLUE}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No Ongoing Reservation
              </Text>

              <Text style={styles.emptyText}>
                You don&apos;t have an ongoing reservation yet.
                Find a restaurant and start your reservation.
              </Text>

              <Pressable
                style={styles.primaryButton}
                onPress={() => setMode('pick')}>
                <Text style={styles.primaryButtonText}>
                  Do Reserve
                </Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={ongoingRecords}
              keyExtractor={(item) => item.restaurantId}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const restaurant = findRestaurant(item.restaurantId);

                if (!restaurant) return null;

                return (
                  <Pressable
                    style={styles.restaurantCard}
                    onPress={() => openRestaurant(restaurant)}>
                    <View style={styles.restaurantIcon}>
                      <Ionicons
                        name="restaurant-outline"
                        size={24}
                        color={BLUE}
                      />
                    </View>

                    <View style={styles.restaurantInfo}>
                      <Text style={styles.restaurantName}>
                        {restaurant.nameEn}
                      </Text>

                      <Text style={styles.restaurantKorean}>
                        {restaurant.nameKo}
                      </Text>

                      <View style={styles.ongoingBadge}>
                        <Text style={styles.ongoingText}>Ongoing</Text>
                      </View>

                      <Text style={styles.historyDate}>
                        Started: {new Date(item.startedAt).toLocaleString()}
                      </Text>

                      <Text style={styles.restaurantAction}>
                        View details and update status
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={GREY}
                    />
                  </Pressable>
                );
              }}
              ListFooterComponent={
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => setMode('pick')}>
                  <Text style={styles.secondaryButtonText}>
                    Choose another restaurant
                  </Text>
                </Pressable>
              }
            />
          )}
        </View>
      ) : (
        <FlatList
          data={historyRecords}
          keyExtractor={(item) =>
            `${item.restaurantId}-${item.startedAt}`
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <>{renderHistory(item)}</>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="time-outline" size={42} color={GREY} />
              <Text style={styles.emptyTitle}>No reservation history</Text>
              <Text style={styles.emptyText}>
                Completed and cancelled reservations will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f4f7fa',
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14213d',
  },
  subtitle: {
    color: '#6b7a8d',
    fontSize: 13,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe3ec',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: BLUE,
  },
  tabText: {
    color: GREY,
    fontWeight: '500',
  },
  activeTabText: {
    color: BLUE,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#e8f0fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  emptyTitle: {
    color: '#14213d',
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  emptyText: {
    color: GREY,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: BLUE,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  retryButton: {
    padding: 12,
  },
  retryText: {
    color: BLUE,
    fontWeight: '700',
  },
  list: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  pickHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pickTitle: {
    color: '#14213d',
    fontWeight: '700',
    fontSize: 18,
  },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  restaurantIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f0fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantInfo: {
    flex: 1,
    gap: 3,
  },
  restaurantName: {
    color: '#14213d',
    fontWeight: '700',
    fontSize: 16,
  },
  restaurantKorean: {
    color: GREY,
    fontSize: 13,
  },
  restaurantAddress: {
    color: GREY,
    fontSize: 12,
  },
  restaurantAction: {
    color: BLUE,
    fontWeight: '600',
    fontSize: 12,
    marginTop: 5,
  },
  ongoingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff3d9',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 5,
  },
  ongoingText: {
    color: '#a66500',
    fontWeight: '700',
    fontSize: 12,
  },
  historyDate: {
    color: GREY,
    fontSize: 11,
    marginTop: 4,
  },
  historyCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    gap: 5,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  completedBadge: {
    backgroundColor: '#e4f4e8',
  },
  cancelledBadge: {
    backgroundColor: '#fce8e8',
  },
  statusText: {
    fontWeight: '700',
    fontSize: 11,
  },
  completedText: {
    color: '#28763b',
  },
  cancelledText: {
    color: '#b3261e',
  },
  secondaryButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BLUE,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: BLUE,
    fontWeight: '700',
  },
});