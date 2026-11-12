import { FOOD_TYPE_ICON } from '@/components/restaurant-pin';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import { getMapPins, type MapPin } from '@/logic/map-pins';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

// #63: web-only version of the Search map tab, for laptop demos.
// react-native-maps has no web support, so in the browser this tab shows the same
// restaurants as a list. Phones still use index.tsx with the real map.
// Same data as the map pins: badges, and fading for the user's allergies (#14).

const BADGE_LABEL: Record<string, 'halal' | 'noPork' | 'vegan'> = {
  halal: 'halal',
  'no-pork': 'noPork',
  'vegan-option': 'vegan',
};

export default function MapScreenWeb() {
  const [pins, setPins] = useState<MapPin[] | null>(null);
  const router = useRouter();
  const { profile } = useProfile();
  const { t } = useTranslation();

  useEffect(() => {
    getMapPins(profile)
      .then(setPins)
      .catch((error) => {
        console.error('Failed to load restaurants:', error);
        setPins([]);
      });
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

      {pins === null ? (
        <Text style={styles.message}>{t('loading')}</Text>
      ) : (
        <FlatList
          data={pins}
          keyExtractor={(pin) => pin.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.message}>{t('noRestaurants')}</Text>
          }
          renderItem={({ item: pin }) => (
            <Pressable
              style={[styles.row, pin.faded && styles.faded]}
              onPress={() =>
                router.push({ pathname: '/restaurant/[id]', params: { id: pin.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={pin.name}>
              <View style={[styles.icon, pin.faded && styles.iconFaded]}>
                <Text style={styles.iconText}>{FOOD_TYPE_ICON[pin.foodType]}</Text>
              </View>

              <View style={styles.body}>
                <Text style={styles.name}>{pin.name}</Text>
                <View style={styles.badges}>
                  {pin.badges.map((badge) => (
                    <Text key={badge} style={styles.badge}>
                      {BADGE_LABEL[badge] ? t(BADGE_LABEL[badge]) : badge}
                    </Text>
                  ))}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#9aa8b8" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f7fa',
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchText: {
    color: '#8a94a3',
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  message: {
    padding: 24,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  // #14: nothing here is free of the user's allergens
  faded: {
    opacity: 0.4,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFaded: {
    borderColor: '#9aa8b8',
  },
  iconText: {
    fontSize: 20,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14213d',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    fontSize: 12,
    color: '#2e7d32',
    borderWidth: 1,
    borderColor: '#2e7d32',
    borderRadius: 8,
    paddingHorizontal: 6,
  },
});
