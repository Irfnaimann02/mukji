import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FOOD_TYPE_ICON } from '@/components/restaurant-pin';
import type { FoodType, Restaurant } from '@/data/types';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
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

const FOOD_TYPE_KEYS: Record<
  FoodType,
  'koreanFood' | 'chicken' | 'noodles' | 'cafe' | 'halal' | 'koreanFood'
> = {
  korean: 'koreanFood',
  chicken: 'chicken',
  noodles: 'noodles',
  cafe: 'cafe',
  halal: 'halal',
  other: 'koreanFood',
};

export default function SearchScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    recentSearches()
      .then((items) => {
        if (active) setRecent(items);
      })
      .catch(() => {
        if (active) setRecent([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    searchRestaurants(query, profile)
      .then((found) => {
        if (active) setResults(found);
      })
      .catch(() => {
        if (active) setResults([]);
      });

    return () => {
      active = false;
    };
  }, [query, profile]);

  const saveSearch = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    try {
      setRecent(await rememberSearch(trimmed));
    } catch {
      // Search results remain usable even if history cannot be saved.
    }
  };

  const openRestaurant = (restaurant: Restaurant) => {
    void saveSearch(restaurant.nameEn);

    router.push({
      pathname: '/restaurant/[id]',
      params: { id: restaurant.id },
    });
  };

  const clearRecent = async () => {
    try {
      await forgetSearches();
      setRecent([]);
    } catch {
      // Keep the displayed history if clearing fails.
    }
  };

  const typing = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel={t('close')}>
          <Ionicons name="arrow-back" size={24} color={BLUE} />
        </Pressable>

        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void saveSearch(query)}
          placeholder={t('searchHint')}
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
            <Text style={styles.empty}>
              {t('noSearchResults')}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.result}
              onPress={() => openRestaurant(item.restaurant)}>
              <Text style={styles.resultIcon}>
                {FOOD_TYPE_ICON[item.restaurant.foodType]}
              </Text>

              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>
                  {item.restaurant.nameEn}
                </Text>
                <Text style={styles.resultSub}>
                  {item.restaurant.nameKo}
                </Text>
                <Text style={styles.resultType}>
                  {t(FOOD_TYPE_KEYS[item.restaurant.foodType])}
                </Text>
              </View>

              {!item.fits && (
                <Text style={styles.noFit}>
                  {t('doesNotFit')}
                </Text>
              )}
            </Pressable>
          )}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>
            {t('popularForYou')}
          </Text>

          <View style={styles.chips}>
            {popularSearches(profile).map((term) => (
              <Pressable
                key={term}
                style={styles.chip}
                onPress={() => setQuery(term)}>
                <Text style={styles.chipText}>{term}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.recentHeader}>
            <Text style={styles.heading}>
              {t('recentSearches')}
            </Text>

            {recent.length > 0 && (
              <Pressable onPress={() => void clearRecent()} hitSlop={8}>
                <Text style={styles.clear}>{t('clear')}</Text>
              </Pressable>
            )}
          </View>

          {recent.length === 0 ? (
            <Text style={styles.empty}>
              {t('noRecentSearches')}
            </Text>
          ) : (
            recent.map((term) => (
              <Pressable
                key={term}
                style={styles.recentRow}
                onPress={() => setQuery(term)}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={GREY}
                />
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
  screen: {
    flex: 1,
    backgroundColor: '#f4f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
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
  body: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14213d',
    marginTop: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e8f0fb',
  },
  chipText: {
    fontSize: 14,
    color: BLUE,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clear: {
    fontSize: 14,
    color: BLUE,
    marginTop: 8,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  recentText: {
    fontSize: 15,
    color: '#14213d',
  },
  empty: {
    color: '#6b7a8d',
    marginTop: 8,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  resultIcon: {
    fontSize: 26,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14213d',
  },
  resultSub: {
    fontSize: 13,
    color: '#6b7a8d',
    marginTop: 2,
  },
  resultType: {
    fontSize: 12,
    color: '#6b7a8d',
    marginTop: 2,
  },
  noFit: {
    fontSize: 12,
    color: '#c62828',
    fontWeight: '600',
  },
});