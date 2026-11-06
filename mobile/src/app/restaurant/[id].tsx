import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Restaurant } from '@/data/types';
import { useProfile } from '@/hooks/use-profile';
import { DishList } from '@/components/dish-list';
import { findRestaurant } from '@/logic/restaurant-service';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [r, setR] = useState<Restaurant | null>();
  const { profile } = useProfile();

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
        <DishList
          restaurant={r}
          profile={profile}
          onDishPress={(d) =>
            router.push({ pathname: '/order-card', params: { restaurantId: r.id, dishId: d.id } })
          }
        />

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

const styles = StyleSheet.create({
  page: { padding: 16, gap: 8, paddingBottom: 100 },
  message: { padding: 32 },
  name: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  sub: { color: '#666' },
  badge: { alignSelf: 'flex-start', color: '#2e7d32', fontWeight: '600' },
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
