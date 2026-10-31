import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_PROFILE, type Dish, type DishStatus, type Restaurant } from '@/data/types';
import { dishStatus } from '@/logic/profile-filter';
import { findRestaurant } from '@/logic/restaurant-service';

const STATUS: Record<DishStatus, { label: string; color: string }> = {
  safe: { label: 'Safe', color: '#2e7d32' },
  ask_first: { label: 'Ask first', color: '#ef6c00' },
  avoid: { label: 'Avoid', color: '#c62828' },
};

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [r, setR] = useState<Restaurant | null>();
  // Replace with the saved food profile once #4's profile screen is in.
  const profile = DEFAULT_PROFILE;

  useEffect(() => {
    findRestaurant(id).then((found) => setR(found ?? null));
  }, [id]);

  if (r === undefined) return <Text style={styles.message}>Loading...</Text>;
  if (r === null) return <Text style={styles.message}>Restaurant not found.</Text>;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: r.nameEn }} />
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.name}>{r.nameKo}</Text>
        <Text style={styles.sub}>
          {r.nameEn} · {'₩'.repeat(r.priceLevel)} · {r.address}
        </Text>
        {r.halalCertified && <Text style={styles.badge}>Halal certified</Text>}

        <Text style={styles.heading}>Menu</Text>
        {r.dishes.map((d) => (
          <DishRow key={d.id} dish={d} status={dishStatus(d, r, profile)} />
        ))}

        <Text style={styles.heading}>원산지 (origin)</Text>
        {r.origin.length === 0 ? (
          <Text style={styles.sub}>Not checked yet</Text>
        ) : (
          r.origin.map((o) => (
            <Text key={o.itemKo}>
              {o.itemKo}: {o.country}
            </Text>
          ))
        )}
      </ScrollView>

      {/* Opens Aqil's ContactSheet (#16) once it exists. */}
      <Pressable style={styles.reserve} onPress={() => {}}>
        <Text style={styles.reserveText}>Do reservation</Text>
      </Pressable>
    </View>
  );
}

// Tapping a dish will open Aqil's Korean order card (#9) once it exists.
function DishRow({ dish, status }: { dish: Dish; status: DishStatus }) {
  const s = STATUS[status];
  return (
    <View style={styles.dish}>
      <View style={styles.dishTop}>
        <Text style={styles.dishName}>
          {dish.nameKo} · ₩{dish.priceWon.toLocaleString()}
        </Text>
        <Text style={[styles.status, { color: s.color, borderColor: s.color }]}>{s.label}</Text>
      </View>
      <Text style={styles.sub}>{dish.nameEn}</Text>
      <Text style={styles.small}>
        Contains: {dish.contains.join(', ') || 'nothing listed'}
        {dish.mayContain.length > 0 ? ` · May contain: ${dish.mayContain.join(', ')}` : ''}
      </Text>
      {status !== 'safe' && dish.leaveOutEn && (
        <Text style={styles.small}>Ask: {dish.leaveOutEn}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 8, paddingBottom: 100 },
  message: { padding: 32 },
  name: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  sub: { color: '#666' },
  small: { fontSize: 12, color: '#666' },
  badge: { alignSelf: 'flex-start', color: '#2e7d32', fontWeight: '600' },
  dish: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 2 },
  dishTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dishName: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  status: { fontSize: 12, fontWeight: '700', borderWidth: 1, borderRadius: 8, paddingHorizontal: 6 },
  reserve: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reserveText: { color: 'white', fontSize: 16, fontWeight: '700' },
});