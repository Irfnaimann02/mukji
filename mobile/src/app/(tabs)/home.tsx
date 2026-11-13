import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FOOD_TYPE_ICON } from '@/components/restaurant-pin';
import type { FoodType } from '@/data/types';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import { badgesFor } from '@/logic/map-pins';
import {
  nearbyRestaurants,
  walkMinutes,
  type NearbyRestaurant,
} from '@/logic/nearby-service';

const COLORS = {
  ink: '#202124',
  muted: '#777B83',
  coral: '#F15A3B',
  background: '#FFF9F5',
  border: '#F0E8E2',
};

const FOOD_TYPES: {
  type: FoodType;
  label: 'koreanFood' | 'chicken' | 'noodles' | 'cafe' | 'halal';
}[] = [
  { type: 'korean', label: 'koreanFood' },
  { type: 'chicken', label: 'chicken' },
  { type: 'noodles', label: 'noodles' },
  { type: 'cafe', label: 'cafe' },
  { type: 'halal', label: 'halal' },
];

export default function HomeScreen() {
  const location = useCurrentLocation();
  const { profile } = useProfile();
  const { t } = useTranslation();

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
  }, [foodType, location.point, profile]);

  useEffect(() => {
    if (!location.ready) return;

    const timer = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timer);
  }, [location.ready, load]);

  const openRestaurant = (item: NearbyRestaurant) =>
    router.push({ pathname: '/restaurant/[id]', params: { id: item.restaurant.id } });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.restaurant.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.brand}>MUKJI<Text style={styles.brandDot}>.</Text></Text>
                <View style={styles.locationLine}>
                  <Ionicons name="location" size={13} color={COLORS.coral} />
                  <Text style={styles.locationText}>
                    {location.isGps ? t('fromYourLocation') : t('fromCampus')}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={COLORS.muted} />
                </View>
              </View>
              <Pressable style={styles.avatarButton} onPress={() => router.push('/(tabs)/profile')}>
                <Ionicons name="person-outline" size={20} color={COLORS.ink} />
              </Pressable>
            </View>

            <Pressable style={styles.searchBar} onPress={() => router.push('/search')} accessibilityRole="button">
              <Ionicons name="search" size={20} color={COLORS.muted} />
              <Text style={styles.searchPlaceholder}>{t('searchRestaurantsOrFood')}</Text>
              <View style={styles.searchFilter}><Ionicons name="options-outline" size={17} color="#fff" /></View>
            </Pressable>

            <View style={styles.hero}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&auto=format&fit=crop&q=90' }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.heroShade} />
              <View style={styles.heroContent}>
                <View style={styles.heroTag}><Ionicons name="sparkles" size={11} color="#fff" /><Text style={styles.heroTagText}>EAT WITH CONFIDENCE</Text></View>
                <Text style={styles.heroTitle}>Your food.{ '\n' }Your choice.</Text>
                <Text style={styles.heroSubtitle}>Find dishes that fit your dietary needs.</Text>
                <Pressable style={styles.heroButton} onPress={() => router.push('/search')}>
                  <Text style={styles.heroButtonText}>Explore restaurants</Text>
                  <Ionicons name="arrow-forward" size={15} color={COLORS.ink} />
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionTitle}>Your food preferences</Text><Text style={styles.sectionSubtitle}>Choose what matters to you</Text></View>
              <Pressable onPress={() => router.push('/(tabs)/profile')}><Text style={styles.editText}>Edit</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.preferenceRow}>
              {[
                { label: 'Halal', icon: 'moon-outline' as const },
                { label: 'Vegan', icon: 'leaf-outline' as const },
                { label: 'No pork', icon: 'ban-outline' as const },
                { label: 'Allergies', icon: 'alert-circle-outline' as const },
              ].map((preference) => (
                <Pressable key={preference.label} style={styles.preferenceChip} onPress={() => router.push('/(tabs)/profile')}>
                  <Ionicons name={preference.icon} size={15} color={COLORS.coral} />
                  <Text style={styles.preferenceText}>{preference.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionTitle}>What are you craving?</Text><Text style={styles.sectionSubtitle}>Explore by food type</Text></View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {FOOD_TYPES.map(({ type, label }) => {
                const active = foodType === type;
                return (
                  <Pressable key={type} onPress={() => setFoodType(active ? null : type)} style={[styles.category, active && styles.categoryActive]}>
                    <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
                      <Text style={styles.categoryEmoji}>{FOOD_TYPE_ICON[type]}</Text>
                    </View>
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{t(label)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Near you</Text>
                <Text style={styles.sectionSubtitle}>{t('within')} {profile.maxDistanceM / 1000} {t('km')} · {location.isGps ? t('fromYourLocation') : t('fromCampus')}</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)')} style={styles.seeAll}><Text style={styles.seeAllText}>View map</Text><Ionicons name="arrow-forward" size={13} color={COLORS.coral} /></Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={28} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>{t('couldNotLoadRestaurants')}</Text>
              <Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>{t('tryAgain')}</Text></Pressable>
            </View>
          ) : loading ? (
            <View style={styles.emptyState}><ActivityIndicator size="large" color={COLORS.coral} /></View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={28} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>{t('noNearbyRestaurants')}</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const restaurant = item.restaurant;

          return (
            <Pressable style={styles.restaurantCard} onPress={() => openRestaurant(item)}>
              <View style={styles.restaurantIconContainer}>
                <Text style={styles.restaurantIcon}>
                  {FOOD_TYPE_ICON[restaurant.foodType]}
                </Text>
              </View>
              <View style={styles.restaurantInfo}>
                <View style={styles.restaurantNameRow}>
                  <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.nameEn}</Text>
                  <View style={styles.rating}><Ionicons name="star" size={12} color="#E6A23C" /><Text style={styles.ratingText}>{restaurant.recommendCount === 0 ? '—' : restaurant.rating.toFixed(1)}</Text></View>
                </View>
                <Text style={styles.restaurantKo} numberOfLines={1}>{restaurant.nameKo}</Text>
                {restaurant.featuredDishNameEn ? <Text style={styles.featuredDish} numberOfLines={1}>Featured: {restaurant.featuredDishNameEn}</Text> : null}
                <Text style={styles.restaurantMeta}>{Math.round(item.meters)} m · {t('walkTime', { minutes: walkMinutes(item.meters) })} · {'₩'.repeat(restaurant.priceLevel)}</Text>
                <View style={styles.badges}>
                  {badgesFor(restaurant).slice(0, 3).map((badge) => <Text key={badge} style={styles.badge}>{badge}</Text>)}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B5AAA3" />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 24 },
  header: { paddingHorizontal: 20, paddingTop: 7, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: COLORS.ink, fontSize: 25, fontWeight: '900', letterSpacing: 1.4 },
  brandDot: { color: COLORS.coral },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  locationText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  avatarButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  searchBar: { height: 52, marginHorizontal: 20, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, paddingLeft: 15, paddingRight: 7, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchPlaceholder: { color: '#A39B95', fontSize: 13, flex: 1 },
  searchFilter: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.coral, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 204, marginHorizontal: 20, marginTop: 18, borderRadius: 22, overflow: 'hidden', backgroundColor: '#49352D' },
  heroImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  heroShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,16,13,0.43)' },
  heroContent: { flex: 1, padding: 18, justifyContent: 'center', alignItems: 'flex-start' },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 8 },
  heroTagText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 27, lineHeight: 29, fontWeight: '900', letterSpacing: -0.5 },
  heroSubtitle: { color: '#F8F3EF', fontSize: 11, marginTop: 6 },
  heroButton: { marginTop: 12, borderRadius: 11, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroButtonText: { color: COLORS.ink, fontSize: 11, fontWeight: '900' },
  sectionHeader: { paddingHorizontal: 20, marginTop: 24, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  sectionSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  editText: { color: COLORS.coral, fontSize: 12, fontWeight: '800' },
  preferenceRow: { paddingHorizontal: 20, gap: 8 },
  preferenceChip: { height: 38, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 },
  preferenceText: { color: COLORS.ink, fontSize: 11, fontWeight: '700' },
  categoryRow: { paddingHorizontal: 20, gap: 15 },
  category: { width: 63, alignItems: 'center', gap: 6 },
  categoryActive: { opacity: 1 },
  categoryIcon: { width: 55, height: 55, borderRadius: 19, backgroundColor: '#F5EAE2', alignItems: 'center', justifyContent: 'center' },
  categoryIconActive: { backgroundColor: '#FCE0D7', borderWidth: 1.5, borderColor: COLORS.coral },
  categoryEmoji: { fontSize: 24 },
  categoryText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  categoryTextActive: { color: COLORS.coral },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { color: COLORS.coral, fontSize: 11, fontWeight: '800' },
  restaurantCard: { minHeight: 112, marginHorizontal: 20, marginBottom: 11, padding: 10, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 11 },
  restaurantIconContainer: {
    width: 91,
    height: 91,
    borderRadius: 13,
    backgroundColor: '#F5EAE2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  restaurantIcon: {
    fontSize: 38,
  },
  restaurantInfo: { flex: 1, minWidth: 0 },
  restaurantNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  restaurantName: { color: COLORS.ink, fontSize: 13, fontWeight: '900', flex: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: COLORS.ink, fontSize: 10, fontWeight: '800' },
  restaurantKo: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  featuredDish: { color: '#A64B34', fontSize: 10, fontWeight: '700', marginTop: 4 },
  restaurantMeta: { color: COLORS.muted, fontSize: 10, marginTop: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  badge: { color: '#A64B34', backgroundColor: '#FFF0EA', fontSize: 9, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, overflow: 'hidden' },
  emptyState: { minHeight: 115, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 25 },
  emptyTitle: { color: COLORS.muted, fontSize: 12, textAlign: 'center' },
  retry: { backgroundColor: COLORS.coral, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 8 },
  retryText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
