import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Diet, Restaurant, Review, ReviewEligibility, VisitKind } from '@/data/types';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/i18n/translations';
import {
  checkIn,
  defaultReviewDiets,
  loadReviewEligibility,
  loadReviews,
  postReview,
  REVIEW_BODY_MAX,
  REVIEW_DIETS,
  reviewErrorKey,
  starText,
  loadReviewStars,
  summarizeStars,
} from '@/logic/review-service';
import { showAlert } from '@/components/show-alert';

// #52 Reviews after eating. Only people who ate here can write one:
// a completed reservation, or a check-in within 100 m in the last 7 days.
// The database enforces this (supabase/sql/019); this screen only shows it.

// Only a completed reservation counts as a verified visit. A GPS check-in can be
// faked, so it gets a plain "Location check-in" label instead.
function VisitBadge({ kind, t }: { kind: VisitKind | null; t: (key: TranslationKey) => string }) {
  if (kind === 'reservation') {
    return <Text style={styles.verified}>✓ {t('verifiedVisitBooked')}</Text>;
  }
  return <Text style={styles.checkIn}>📍 {t('locationCheckIn')}</Text>;
}

const DIET_LABEL: Record<Diet, TranslationKey> = {
  halal: 'halal',
  vegan: 'vegan',
  no_pork: 'noPork',
};

export function ReviewSection({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter();
  const auth = useAuth();
  const { profile } = useProfile();
  const { t, language } = useTranslation();

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [allStars, setAllStars] = useState<number[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);

  const [checkingIn, setCheckingIn] = useState(false);
  const [stars, setStars] = useState(0);
  const [body, setBody] = useState('');
  // null = not touched yet, so follow the food profile (which loads a moment later).
  const [pickedDiets, setPickedDiets] = useState<Diet[] | null>(null);
  const dietTags = pickedDiets ?? defaultReviewDiets(profile.diets);
  const [posting, setPosting] = useState(false);

  // Kakao places live only on Kakao: they are not in our database, so no reviews.
  const reviewable = restaurant.source !== 'kakao';
  const userId = auth.user?.id ?? null;
  const loggedIn = auth.user !== null && !auth.isAnonymous;

  // Reads reviews and, for logged-in users, whether they may write one.
  // Returns the data; callers decide when to put it on screen.
  const fetchAll = useCallback(async () => {
    let list: Review[] = [];
    let stars: number[] = [];
    let failed = false;
    try {
      [list, stars] = await Promise.all([loadReviews(restaurant.id, userId), loadReviewStars(restaurant.id)]);
    } catch (error) {
      console.warn('Could not load reviews:', error);
      failed = true;
    }

    let canWrite: ReviewEligibility | null = null;
    if (loggedIn) {
      try {
        canWrite = await loadReviewEligibility(restaurant.id);
      } catch (error) {
        console.warn('Could not check review eligibility:', error);
      }
    }
    return { list, stars, failed, canWrite };
  }, [restaurant.id, userId, loggedIn]);

  const refresh = async () => {
    const result = await fetchAll();
    setReviews(result.list);
    setAllStars(result.stars);
    setLoadFailed(result.failed);
    setEligibility(result.canWrite);
  };

  useEffect(() => {
    if (!reviewable || !auth.ready) return;
    let active = true;
    fetchAll().then((result) => {
      if (!active) return;
      setReviews(result.list);
      setAllStars(result.stars);
      setLoadFailed(result.failed);
      setEligibility(result.canWrite);
    });
    return () => {
      active = false;
    };
  }, [reviewable, auth.ready, fetchAll]);

  if (!reviewable) return null;

  const handleCheckIn = async () => {
    if (checkingIn) return;
    setCheckingIn(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert(t('locationNeededTitle'), t('locationNeededBody'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const result = await checkIn(restaurant.id, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      if (!result.checkedIn) {
        showAlert(t('tooFarTitle'), t('tooFarBody', { meters: result.distanceM }));
        return;
      }
      showAlert(t('checkedInTitle'), t('checkedInBody'));
      await refresh();
    } catch (error) {
      showAlert(t('updateFailed'), t(reviewErrorKey(error)));
    } finally {
      setCheckingIn(false);
    }
  };

  const handlePost = async () => {
    if (posting) return;
    if (stars < 1) {
      showAlert(t('writeReview'), t('pickStarsFirst'));
      return;
    }
    setPosting(true);
    try {
      await postReview(restaurant.id, stars, body, dietTags);
      setStars(0);
      setBody('');
      showAlert(t('reviewPostedTitle'), t('reviewPostedBody'));
      await refresh();
    } catch (error) {
      showAlert(t('updateFailed'), t(reviewErrorKey(error)));
      await refresh();
    } finally {
      setPosting(false);
    }
  };

  const toggleDiet = (diet: Diet) =>
    setPickedDiets(dietTags.includes(diet) ? dietTags.filter((d) => d !== diet) : [...dietTags, diet]);

  const summary = summarizeStars(allStars);
  const dateLocale = language === 'ko' ? 'ko-KR' : 'en-GB';

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>{t('reviewsHeading')}</Text>
        {summary.count > 0 && (
          <Text style={styles.summary}>
            ★ {summary.average.toFixed(1)} ·{' '}
            {summary.count === 1 ? t('reviewCountOne') : t('reviewCount', { count: summary.count })}
          </Text>
        )}
      </View>

      {/* What this user can do here */}
      {!auth.ready ? null : !loggedIn ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('loginToReview')}</Text>
          <Text style={styles.cardText}>{t('loginToReviewHint')}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => router.push('/user-login')}>
            <Text style={styles.secondaryButtonText}>{t('logInButton')}</Text>
          </Pressable>
        </View>
      ) : eligibility === null ? null : eligibility.alreadyReviewed ? (
        <Text style={styles.muted}>{t('alreadyReviewed')}</Text>
      ) : eligibility.canReview ? (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.cardTitle}>{t('writeReview')}</Text>
            <VisitBadge kind={eligibility.visitKind} t={t} />
          </View>

          <Text style={styles.label}>{t('yourRating')}</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setStars(n)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`${n} / 5`}>
                <Text style={[styles.starButton, n <= stars && styles.starOn]}>{n <= stars ? '★' : '☆'}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{t('reviewDietLabel')}</Text>
          <View style={styles.chipRow}>
            {REVIEW_DIETS.map((diet) => {
              const on = dietTags.includes(diet);
              return (
                <Pressable key={diet} onPress={() => toggleDiet(diet)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(DIET_LABEL[diet])}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={styles.input}
            value={body}
            onChangeText={setBody}
            placeholder={t('reviewBodyPlaceholder')}
            placeholderTextColor="#8a97a8"
            multiline
            maxLength={REVIEW_BODY_MAX}
          />
          <Text style={styles.counter}>
            {body.length}/{REVIEW_BODY_MAX}
          </Text>

          <Pressable
            style={[styles.primaryButton, posting && styles.disabled]}
            disabled={posting}
            onPress={() => void handlePost()}>
            <Text style={styles.primaryButtonText}>{posting ? t('postingReview') : t('postReview')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('ateHereQuestion')}</Text>
          <Text style={styles.cardText}>{t('checkInHint')}</Text>
          <Pressable
            style={[styles.secondaryButton, checkingIn && styles.disabled]}
            disabled={checkingIn}
            onPress={() => void handleCheckIn()}>
            {checkingIn ? (
              <View style={styles.busyRow}>
                <ActivityIndicator size="small" color="#1b5fad" />
                <Text style={styles.secondaryButtonText}>{t('checkingIn')}</Text>
              </View>
            ) : (
              <Text style={styles.secondaryButtonText}>📍 {t('checkInButton')}</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* The reviews */}
      {reviews === null ? (
        <ActivityIndicator style={styles.loading} color="#1b5fad" />
      ) : loadFailed ? (
        <Text style={styles.muted}>{t('reviewsLoadFailed')}</Text>
      ) : reviews.length === 0 ? (
        <Text style={styles.muted}>{t('noReviewsBeFirst')}</Text>
      ) : (
        reviews.map((review) => (
          <View key={review.id} style={styles.review}>
            <View style={styles.headerRow}>
              <Text style={styles.reviewStars}>{starText(review.stars)}</Text>
              <Text style={styles.date}>
                {review.mine ? `${t('reviewByYou')} · ` : ''}
                {new Date(review.createdAt).toLocaleDateString(dateLocale)}
              </Text>
            </View>
            <VisitBadge kind={review.visitKind} t={t} />
            {review.dietTags.length > 0 && (
              <View style={styles.chipRow}>
                {review.dietTags.map((diet) => (
                  <Text key={diet} style={styles.tag}>
                    {DIET_LABEL[diet] ? t(DIET_LABEL[diet]) : diet}
                  </Text>
                ))}
              </View>
            )}
            {review.body !== '' && <Text style={styles.body}>{review.body}</Text>}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10, marginTop: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  heading: { fontSize: 18, fontWeight: '600', color: '#14213d' },
  summary: { color: '#14213d', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#14213d', flexShrink: 1 },
  cardText: { color: '#6b7a8d', lineHeight: 20 },
  label: { color: '#14213d', fontWeight: '600', marginTop: 4 },
  starRow: { flexDirection: 'row', gap: 6 },
  starButton: { fontSize: 30, color: '#c3ccd8' },
  starOn: { color: '#f2a900' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#c3ccd8', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { borderColor: '#2e7d32', backgroundColor: '#e8f5e9' },
  chipText: { color: '#4a5a6e', fontWeight: '600' },
  chipTextOn: { color: '#2e7d32' },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#d5dde7',
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
    color: '#14213d',
    backgroundColor: '#fafcfe',
  },
  counter: { alignSelf: 'flex-end', color: '#8a97a8', fontSize: 12 },
  primaryButton: { backgroundColor: '#1b5fad', padding: 13, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#1b5fad',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryButtonText: { color: '#1b5fad', fontWeight: '700' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disabled: { opacity: 0.5 },
  muted: { color: '#6b7a8d' },
  loading: { marginVertical: 8 },
  review: { backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 6 },
  reviewStars: { color: '#f2a900', fontSize: 16 },
  date: { color: '#8a97a8', fontSize: 12 },
  verified: {
    alignSelf: 'flex-start',
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  checkIn: {
    alignSelf: 'flex-start',
    color: '#4a5a6e',
    backgroundColor: '#eef2f7',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tag: {
    color: '#4a5a6e',
    backgroundColor: '#eef2f7',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  body: { color: '#14213d', lineHeight: 20 },
});
