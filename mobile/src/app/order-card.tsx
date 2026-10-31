import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Restaurant } from '@/data/types';
import { useProfile } from '@/hooks/use-profile';
import { buildOrderPhrases } from '@/logic/order-phrases';
import { findRestaurant } from '@/logic/restaurant-service';

const BLUE = '#1b5fad';

// Full-screen card to show restaurant staff. Open it with:
// router.push({ pathname: '/order-card', params: { restaurantId, dishId } })
export default function OrderCardScreen() {
  const { restaurantId, dishId } = useLocalSearchParams<{ restaurantId: string; dishId: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const [r, setR] = useState<Restaurant | null>();
  const [index, setIndex] = useState(0);
  const [height, setHeight] = useState(0);
  const { profile } = useProfile();

  useEffect(() => {
    findRestaurant(restaurantId).then((found) => setR(found ?? null));
  }, [restaurantId]);

  const dish = r?.dishes.find((d) => d.id === dishId);
  const phrases = useMemo(() => (dish ? buildOrderPhrases(dish, profile) : []), [dish, profile]);

  const go = (next: number) => {
    const k = Math.max(0, Math.min(phrases.length - 1, next));
    listRef.current?.scrollToIndex({ index: k, animated: true });
    setIndex(k);
  };

  if (r === undefined) return <View style={styles.center}><Text style={styles.en}>Loading...</Text></View>;
  if (!dish) return <View style={styles.center}><Text style={styles.en}>Dish not found.</Text></View>;

  const last = phrases.length - 1;
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close">
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <View style={styles.dishBox}>
          <Text style={styles.dishKo}>{dish.nameKo}</Text>
          <Text style={styles.dishEn}>{dish.nameEn}</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        style={styles.list}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        data={phrases}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p, k) => `${k}-${p.ko}`}
        getItemLayout={(_, k) => ({ length: width, offset: width * k, index: k })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.page, { width, height: height || undefined }]}>
            <Text style={styles.ko} adjustsFontSizeToFit numberOfLines={4}>{item.ko}</Text>
            {item.rom ? <Text style={styles.rom}>{item.rom}</Text> : null}
            {item.en ? <Text style={styles.en}>{item.en}</Text> : null}
          </View>
        )}
      />

      <View style={styles.bar}>
        <Pressable onPress={() => go(index - 1)} disabled={index === 0} accessibilityLabel="Previous phrase"
          style={[styles.nav, index === 0 && styles.navOff]}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.count}>{index + 1} / {phrases.length}</Text>
        <Pressable onPress={() => go(index + 1)} disabled={index === last} accessibilityLabel="Next phrase"
          style={[styles.nav, index === last && styles.navOff]}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLUE },
  center: { flex: 1, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 16 },
  close: { color: '#fff', fontSize: 26 },
  dishBox: { flex: 1, alignItems: 'center', marginRight: 26 },
  dishKo: { color: '#fff', fontSize: 20, fontWeight: '700' },
  dishEn: { color: '#cfe0f6', fontSize: 14 },
  list: { flex: 1 },
  page: { padding: 28, justifyContent: 'center', alignItems: 'center', gap: 18 },
  ko: { alignSelf: 'stretch', color: '#fff', fontSize: 44, fontWeight: '800', textAlign: 'center' },
  rom: { color: '#fff', fontSize: 20, textAlign: 'center' },
  en: { color: '#dbe9fb', fontSize: 18, textAlign: 'center' },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 12 },
  nav: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  navOff: { opacity: 0.3 },
  navText: { color: '#fff', fontSize: 32, lineHeight: 36 },
  count: { color: '#fff', fontSize: 16 },
});