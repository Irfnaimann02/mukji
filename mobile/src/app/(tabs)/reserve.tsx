import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContactSheet } from '@/components/contact-sheet';
import { EmptyState } from '@/components/empty-state';
import { FOOD_TYPE_ICON } from '@/components/restaurant-pin';
import { SegmentedTabs } from '@/components/segmented-tabs';
import type { Restaurant } from '@/data/types';
import { useReservations } from '@/hooks/use-reservations';
import { listRestaurants } from '@/logic/restaurant-service';

const TABS = ['Restaurant', 'History'];

export default function ReserveScreen() {
  const { contactedIds } = useReservations();
  const [tab, setTab] = useState('Restaurant');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Restaurant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setRestaurants(await listRestaurants());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const history = contactedIds
    .map((id) => restaurants.find((r) => r.id === id))
    .filter((r): r is Restaurant => !!r);

  const row = ({ item }: { item: Restaurant }) => (
    <Pressable style={styles.row} onPress={() => setSelected(item)}>
      <Text style={styles.rowIcon}>{FOOD_TYPE_ICON[item.foodType]}</Text>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.nameEn}</Text>
        <Text style={styles.small}>
          {item.nameKo} · {item.phone || 'No phone listed'}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );

  let body;
  if (error) {
    body = (
      <EmptyState
        icon="⚠️"
        title="Could not load restaurants"
        message="Check your connection and try again."
        buttonLabel="Try again"
        onPress={load}
      />
    );
  } else if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  } else if (tab === 'Restaurant') {
    body = (
      <FlatList
        data={restaurants}
        keyExtractor={(r) => r.id}
        renderItem={row}
        ListHeaderComponent={
          <Text style={styles.hint}>
            Pick a restaurant to see how to call and what to say in Korean.
          </Text>
        }
      />
    );
  } else if (history.length > 0) {
    body = <FlatList data={history} keyExtractor={(r) => r.id} renderItem={row} />;
  } else {
    body = (
      <EmptyState
        icon="🕘"
        title="No history yet"
        message="Places you contact will show up here."
        buttonLabel="Find a restaurant"
        onPress={() => router.navigate('/')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.top}>
        <Pressable onPress={() => router.navigate('/home')} hitSlop={12} accessibilityLabel="Back">
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title}>🍴 Reservation</Text>
      </View>
      <SegmentedTabs items={TABS} value={tab} onChange={setTab} />
      <View style={styles.body}>{body}</View>
      <ContactSheet restaurant={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f7fa' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  back: { fontSize: 22, color: '#14213d' },
  title: { fontSize: 17, fontWeight: '700', color: '#14213d' },
  body: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { color: '#6b7a8d', paddingHorizontal: 14, paddingVertical: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8eef4',
  },
  rowIcon: { fontSize: 28 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700', color: '#14213d' },
  small: { fontSize: 12, color: '#6b7a8d' },
  chevron: { fontSize: 20, color: '#9aa8b8' },
});