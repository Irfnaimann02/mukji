import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FOOD_TYPE_ICON } from '@/components/restaurant-pin';
import type { Restaurant } from '@/data/types';
import { useProfile } from '@/hooks/use-profile';
import {
  forgetSearches,
  popularSearches,
  recentSearches,
  rememberSearch,
  searchRestaurants,
  type SearchResult,
} from '@/logic/search-service';

const BLUE = '#1b5fad';
const GREY = '#8a94a3';

export default function SearchScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    recentSearches().then(setRecent);
  }, []);

  useEffect(() => {
    let cancelled = false;
    searchRestaurants(query, profile)
      .then((found) => {
        if (!cancelled) setResults(found);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [query, profile]);

  const remember = async (text: string) => setRecent(await rememberSearch(text));

  const openRestaurant = (restaurant: Restaurant) => {
    remember(restaurant.nameEn);
    router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } });
  };

  const clearRecent = async () => {
    await forgetSearches();
    setRecent([]);
  };

  const typing = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={BLUE} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => remember(query)}
          placeholder="Search restaurants or food"
          placeholderTextColor={GREY}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {typing ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.restaurant.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.body}
          ListEmptyComponent={
            <Text style={styles.empty}>{`No restaurants match "${query.trim()}".`}</Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.result} onPress={() => openRestaurant(item.restaurant)}>
              <Text style={styles.resultIcon}>{FOOD_TYPE_ICON[item.restaurant.foodType]}</Text>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.restaurant.nameEn}</Text>
                <Text style={styles.resultSub}>{item.restaurant.nameKo}</Text>
              </View>
              {!item.fits && <Text style={styles.noFit}>Doesn't fit</Text>}
            </Pressable>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Popular for you</Text>
          <View style={styles.chips}>
            {popularSearches(profile).map((term) => (
              <Pressable key={term} style={styles.chip} onPress={() => setQuery(term)}>
                <Text style={styles.chipText}>{term}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.recentHeader}>
            <Text style={styles.heading}>Recent searches</Text>
            {recent.length > 0 && (
              <Pressable onPress={clearRecent} hitSlop={8}>
                <Text style={styles.clear}>Clear</Text>
              </Pressable>
            )}
          </View>
          {recent.length === 0 ? (
            <Text style={styles.empty}>No recent searches yet.</Text>
          ) : (
            recent.map((term) => (
              <Pressable key={term} style={styles.recentRow} onPress={() => setQuery(term)}>
                <Ionicons name="time-outline" size={18} color={GREY} />
                <Text style={styles.recentText}>{term}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7fa' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe3ec',
    fontSize: 15,
    color: '#14213d',
  },
  body: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  heading: { fontSize: 16, fontWeight: '700', color: '#14213d', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e8f0fb',
  },
  chipText: { fontSize: 14, color: BLUE },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clear: { fontSize: 14, color: BLUE, marginTop: 8 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  recentText: { fontSize: 15, color: '#14213d' },
  empty: { color: '#6b7a8d', marginTop: 8 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  resultIcon: { fontSize: 26 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 16, fontWeight: '600', color: '#14213d' },
  resultSub: { fontSize: 13, color: '#6b7a8d', marginTop: 2 },
  noFit: { fontSize: 12, color: '#c62828', fontWeight: '600' },
});