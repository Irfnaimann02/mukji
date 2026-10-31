import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FOOD_TYPE_ICON } from '@/components/restaurant-pin';
import { DEFAULT_PROFILE, type FoodType } from '@/data/types';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { badgesFor } from '@/logic/map-pins';
import { nearbyRestaurants, walkMinutes, type NearbyRestaurant } from '@/logic/nearby-service';

const FOOD_TYPES: { type: FoodType; label: string }[] = [
  { type: 'korean', label: 'Korean' },
  { type: 'chicken', label: 'Chicken' },
  { type: 'noodles', label: 'Noodles' },
  { type: 'cafe', label: 'Cafe' },
  { type: 'halal', label: 'Halal' },
];

// TODO: use the saved profile once the profile store from #4 is ready.
const profile = DEFAULT_PROFILE;

export default function HomeScreen() {
  const location = useCurrentLocation();
  const [foodType, setFoodType] = useState<FoodType | null>(null);
  const [items, setItems] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await nearbyRestaurants(profile, foodType, location.point));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [foodType, location.point]);

  useEffect(() => {
    if (location.ready) load();
  }, [location.ready, load]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>Near you</Text>
      <Text style={styles.subtitle}>
        {location.isGps ? 'From your location' : 'From the middle of campus'} · within{' '}
        {profile.maxDistanceM / 1000} km
      </Text>

      <View style={styles.chips}>
        {FOOD_TYPES.map(({ type, label }) => {
          const active = foodType === type;
          return (
            <Pressable
              key={type}
              onPress={() => setFoodType(active ? null : type)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {FOOD_TYPE_ICON[type]} {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.message}>Could not load restaurants.</Text>
          <Pressable onPress={load} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : !location.ready || (loading && items.length === 0) ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.restaurant.id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={
            <Text style={styles.message}>No restaurants fit your profile nearby.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/restaurant/[id]', params: { id: item.restaurant.id } })
              }>
              <Text style={styles.cardIcon}>{FOOD_TYPE_ICON[item.restaurant.foodType]}</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.restaurant.nameEn}</Text>
                <Text style={styles.detail}>
                  {item.restaurant.nameKo} · {Math.round(item.meters)} m · {walkMinutes(item.meters)}{' '}
                  min walk
                </Text>
                <View style={styles.badges}>
                  {badgesFor(item.restaurant).map((badge) => (
                    <Text key={badge} style={styles.badge}>
                      {badge}
                    </Text>
                  ))}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f7fa' },
  title: { fontSize: 24, fontWeight: '700', color: '#14213d', paddingHorizontal: 16, paddingTop: 8 },
  subtitle: { fontSize: 13, color: '#6b7a8d', paddingHorizontal: 16, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe3ec',
  },
  chipActive: { backgroundColor: '#1b5fad', borderColor: '#1b5fad' },
  chipText: { fontSize: 14, color: '#14213d' },
  chipTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  message: { textAlign: 'center', color: '#6b7a8d', marginTop: 40 },
  retry: { backgroundColor: '#1b5fad', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 12 },
  cardIcon: { fontSize: 28 },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#14213d' },
  detail: { fontSize: 13, color: '#6b7a8d', marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: {
    fontSize: 12,
    color: '#1b5fad',
    backgroundColor: '#e8f0fb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
