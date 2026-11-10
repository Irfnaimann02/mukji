
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getFavourites,
  removeFavourite,
  saveFavouriteNote,
  type FavouriteRecord,
} from '@/data/favourites-store';
import type { Restaurant } from '@/data/types';
import { listRestaurants } from '@/logic/restaurant-service';
import { useTranslation } from '@/hooks/use-translation';

export default function FavouritesScreen() {
  const router = useRouter();
  const { language } = useTranslation();
  const isKorean = language === 'ko';

  const copy = isKorean
    ? {
        title: '내 즐겨찾기',
        subtitle: '저장한 음식점과 개인 메모를 확인하세요.',
        loading: '즐겨찾기를 불러오는 중...',
        loadError: '즐겨찾기를 불러올 수 없습니다',
        connectionError: '인터넷 연결을 확인한 후 다시 시도해 주세요.',
        tryAgain: '다시 시도',
        emptyTitle: '아직 즐겨찾기가 없습니다',
        emptyDescription:
          '음식점 페이지에서 하트 버튼을 눌러 저장하세요. 저장한 음식점이 여기에 표시됩니다.',
        explore: '음식점 둘러보기',
        saved: '개 저장됨',
        restaurant: '음식점',
        restaurants: '음식점',
        unavailable: '음식점 정보를 확인할 수 없음',
        noRating: '평점 없음',
        rating: '평점',
        removeLabel: '즐겨찾기에서 삭제',
        unavailableDescription:
          '현재 음식점 정보를 불러올 수 없습니다. 저장한 메모는 계속 확인할 수 있습니다.',
        privateNote: '비공개 메모',
        notePlaceholder: '나만 볼 수 있는 메모를 작성하세요...',
        saving: '저장 중...',
        saveNote: '메모 저장',
        noteSaved: '메모 저장 완료',
        noteSavedDescription: '비공개 메모가 이 기기에 저장되었습니다.',
        saveFailed: '저장 실패',
        tryAgainShort: '다시 시도해 주세요.',
        removeTitle: '즐겨찾기를 삭제할까요?',
        removeDescription:
          '이 음식점과 해당 음식점의 비공개 메모가 즐겨찾기에서 삭제됩니다.',
        keep: '유지',
        remove: '삭제',
        removeFailed: '삭제 실패',
        privacy:
          '비공개 메모는 이 기기에만 저장되며 Mukji 음식점 데이터베이스에 업로드되지 않습니다.',
        accessibilityRemove: '즐겨찾기에서 음식점 삭제',
      }
    : {
        title: 'My Favourites',
        subtitle: 'Your saved restaurants and personal notes.',
        loading: 'Loading your favourites...',
        loadError: 'Could not load favourites',
        connectionError: 'Please check your connection and try again.',
        tryAgain: 'Try again',
        emptyTitle: 'No favourites yet',
        emptyDescription:
          'Save a restaurant by tapping the heart on its restaurant page. Your saved places will appear here.',
        explore: 'Explore restaurants',
        saved: 'saved',
        restaurant: 'restaurant',
        restaurants: 'restaurants',
        unavailable: 'Restaurant unavailable',
        noRating: 'No rating yet',
        rating: 'rating',
        removeLabel: 'Remove from favourites',
        unavailableDescription:
          'Restaurant details are currently unavailable. Your saved note is still available.',
        privateNote: 'Private note',
        notePlaceholder: 'Write a note for yourself...',
        saving: 'Saving...',
        saveNote: 'Save note',
        noteSaved: 'Note saved',
        noteSavedDescription:
          'Your private note has been saved on this device.',
        saveFailed: 'Save failed',
        tryAgainShort: 'Please try again.',
        removeTitle: 'Remove favourite?',
        removeDescription:
          'This restaurant and its private note will be removed from your Favourites.',
        keep: 'Keep',
        remove: 'Remove',
        removeFailed: 'Remove failed',
        privacy:
          'Private notes are stored locally on this device and are not uploaded to the Mukji restaurant database.',
        accessibilityRemove: 'Remove from favourites',
      };

  const [favourites, setFavourites] = useState<FavouriteRecord[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadFavourites = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const savedFavourites = await getFavourites();

      setFavourites(savedFavourites);
      setNoteDrafts(
        Object.fromEntries(
          savedFavourites.map((item) => [item.restaurantId, item.note])
        )
      );

      try {
        const allRestaurants = await listRestaurants();
        setRestaurants(allRestaurants);
      } catch (restaurantError) {
        console.error('Failed to load restaurant details:', restaurantError);
        setRestaurants([]);
      }
    } catch (loadError) {
      console.error('Failed to load favourites:', loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFavourites();
    }, [loadFavourites])
  );

  const handleSaveNote = async (restaurantId: string) => {
    if (savingId) return;

    const note = (noteDrafts[restaurantId] ?? '').trim();

    setSavingId(restaurantId);

    try {
      const updated = await saveFavouriteNote(restaurantId, note);
      setFavourites(updated);
      setNoteDrafts((current) => ({
        ...current,
        [restaurantId]: note,
      }));

      Alert.alert(copy.noteSaved, copy.noteSavedDescription);
    } catch (saveError) {
      console.error('Failed to save favourite note:', saveError);
      Alert.alert(copy.saveFailed, copy.tryAgainShort);
    } finally {
      setSavingId(null);
    }
  };

  const handleRemoveFavourite = (restaurantId: string) => {
    Alert.alert(
      copy.removeTitle,
      copy.removeDescription,
      [
        {
          text: copy.keep,
          style: 'cancel',
        },
        {
          text: copy.remove,
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const updated = await removeFavourite(restaurantId);
                setFavourites(updated);
                setNoteDrafts((current) => {
                  const next = { ...current };
                  delete next[restaurantId];
                  return next;
                });
              } catch (removeError) {
                console.error('Failed to remove favourite:', removeError);
                Alert.alert(copy.removeFailed, copy.tryAgainShort);
              }
            })();
          },
        },
      ]
    );
  };

  const restaurantById = new Map(
    restaurants.map((restaurant) => [restaurant.id, restaurant])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1b5fad" />
          <Text style={styles.helper}>{copy.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={42} color="#8a94a3" />
          <Text style={styles.emptyTitle}>{copy.loadError}</Text>
          <Text style={styles.helper}>{copy.connectionError}</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => void loadFavourites()}>
            <Text style={styles.primaryButtonText}>{copy.tryAgain}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        {favourites.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={34} color="#1b5fad" />
            </View>

            <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
            <Text style={styles.helper}>{copy.emptyDescription}</Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/search')}>
              <Text style={styles.primaryButtonText}>{copy.explore}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.count}>
              {favourites.length} {copy.saved}{' '}
              {isKorean
                ? ''
                : favourites.length === 1
                  ? copy.restaurant
                  : copy.restaurants}
            </Text>

            {favourites.map((favourite) => {
              const restaurant = restaurantById.get(favourite.restaurantId);

              return (
                <View key={favourite.restaurantId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Pressable
                      style={styles.restaurantInfo}
                      disabled={!restaurant}
                      onPress={() =>
                        router.push({
                          pathname: '/restaurant/[id]',
                          params: { id: favourite.restaurantId },
                        })
                      }>
                      <Text style={styles.restaurantName}>
                        {restaurant
                          ? isKorean
                            ? restaurant.nameKo
                            : restaurant.nameEn
                          : copy.unavailable}
                      </Text>

                      {restaurant && (
                        <>
                          <Text style={styles.restaurantKo}>
                            {isKorean
                              ? restaurant.nameEn
                              : restaurant.nameKo}
                          </Text>

                          <Text style={styles.restaurantDetail}>
                            {'₩'.repeat(restaurant.priceLevel)} ·{' '}
                            {restaurant.rating > 0
                              ? `${restaurant.rating.toFixed(1)} ${copy.rating}`
                              : copy.noRating}
                          </Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${restaurant?.nameEn ?? copy.restaurant} ${copy.accessibilityRemove}`}
                      hitSlop={10}
                      onPress={() =>
                        handleRemoveFavourite(favourite.restaurantId)
                      }>
                      <Ionicons
                        name="heart-dislike-outline"
                        size={23}
                        color="#c44b55"
                      />
                    </Pressable>
                  </View>

                  {!restaurant && (
                    <Text style={styles.unavailable}>
                      {copy.unavailableDescription}
                    </Text>
                  )}

                  <View style={styles.noteHeading}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={15}
                      color="#6b7a8d"
                    />
                    <Text style={styles.noteLabel}>{copy.privateNote}</Text>
                  </View>

                  <TextInput
                    value={noteDrafts[favourite.restaurantId] ?? ''}
                    onChangeText={(value) =>
                      setNoteDrafts((current) => ({
                        ...current,
                        [favourite.restaurantId]: value,
                      }))
                    }
                    placeholder={copy.notePlaceholder}
                    placeholderTextColor="#8a94a3"
                    multiline
                    maxLength={280}
                    textAlignVertical="top"
                    style={styles.noteInput}
                  />

                  <View style={styles.noteFooter}>
                    <Text style={styles.characterCount}>
                      {(noteDrafts[favourite.restaurantId] ?? '').length}/280
                    </Text>

                    <Pressable
                      style={[
                        styles.saveButton,
                        savingId === favourite.restaurantId && styles.disabled,
                      ]}
                      disabled={savingId !== null}
                      onPress={() =>
                        void handleSaveNote(favourite.restaurantId)
                      }>
                      <Text style={styles.saveButtonText}>
                        {savingId === favourite.restaurantId
                          ? copy.saving
                          : copy.saveNote}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.privacy}>{copy.privacy}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f4f7fa',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#14213d',
  },
  subtitle: {
    color: '#6b7a8d',
    marginTop: 4,
    marginBottom: 20,
  },
  count: {
    color: '#6b7a8d',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  restaurantInfo: {
    flex: 1,
    gap: 3,
  },
  restaurantName: {
    color: '#14213d',
    fontSize: 17,
    fontWeight: '700',
  },
  restaurantKo: {
    color: '#6b7a8d',
    fontSize: 13,
  },
  restaurantDetail: {
    color: '#6b7a8d',
    fontSize: 12,
    marginTop: 3,
  },
  noteHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteLabel: {
    color: '#14213d',
    fontSize: 13,
    fontWeight: '600',
  },
  noteInput: {
    minHeight: 76,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: '#dbe3ec',
    borderRadius: 10,
    padding: 11,
    color: '#14213d',
    backgroundColor: '#fbfcfe',
    fontSize: 14,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  characterCount: {
    color: '#8a94a3',
    fontSize: 11,
  },
  saveButton: {
    backgroundColor: '#1b5fad',
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  unavailable: {
    color: '#a66500',
    fontSize: 13,
    lineHeight: 19,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#e8f0fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    color: '#14213d',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  helper: {
    color: '#6b7a8d',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  primaryButton: {
    backgroundColor: '#1b5fad',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  privacy: {
    color: '#8a94a3',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});
