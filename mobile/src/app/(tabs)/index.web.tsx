// #63: web version of the Search map tab.
// react-native-maps has no web support, so the browser build shows the same
// restaurants as a list instead. Phones still use index.tsx with the real map.

import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import { getMapPins, type MapPin } from '@/logic/map-pins';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function MapScreenWeb() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const router = useRouter();
  const { profile } = useProfile();
  const { t } = useTranslation();

  useEffect(() => {
    getMapPins(profile)
      .then(setPins)
      .catch((error) => console.error('Failed to load map pins:', error));
  }, [profile]);

  return (
    <View style={styles.screen}>
      <Pressable
        style={styles.searchBar}
        onPress={() => router.push('/search')}
        accessibilityRole="button"
        accessibilityLabel={t('searchRestaurantsOrFood')}>
        <Ionicons name="search" size={20} color="#8a94a3" />
        <Text style={styles.searchText}>{t('searchRestaurantsOrFood')}</Text>
      </Pressable>

      <FlatList
        data={pins}
        keyExtractor={(pin) => pin.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: pin }) => (
          <Pressable
            testID={`map-pin-${pin.id}`}
            style={[styles.row, pin.faded && styles.faded]}
            onPress={() =>
              router.push({ pathname: '/restaurant/[id]', params: { id: pin.id } })
            }>
            <Text style={styles.name}>{pin.name}</Text>
            <Text style={styles.detail}>
              {[pin.foodType, ...pin.badges].join(' · ')}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7fa' },
  searchBar: {
    margin: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  searchText: { color: '#8a94a3', fontSize: 15 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  row: { padding: 14, borderRadius: 12, backgroundColor: '#fff' },
  faded: { opacity: 0.45 },
  name: { fontSize: 16, fontWeight: '600', color: '#1c2430' },
  detail: { marginTop: 4, fontSize: 13, color: '#5b6573' },
});
