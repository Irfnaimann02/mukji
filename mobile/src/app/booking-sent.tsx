import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateBlock, PreorderLines, usePeopleLabel } from '@/components/booking-parts';
import type { Restaurant } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import { preorderSummary, won } from '@/logic/booking-details';
import { formatTime } from '@/logic/booking-times';
import { findRestaurant } from '@/logic/restaurant-service';

const GREEN = '#2E8A55';

// #50 Shown right after a booking request is saved.
export default function BookingSentScreen() {
  const params = useLocalSearchParams<{
    restaurantId: string;
    reservedFor: string;
    people: string;
    dishIds?: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const peopleLabel = usePeopleLabel();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    let active = true;
    findRestaurant(params.restaurantId)
      .then((found) => {
        if (active) setRestaurant(found ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [params.restaurantId]);

  const dishIds = params.dishIds ? params.dishIds.split(',').filter(Boolean) : [];
  const preorder = preorderSummary(dishIds, restaurant?.dishes ?? []);
  const people = Number(params.people) || 1;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.success}>
          <View style={styles.checkOuter}>
            <View style={styles.checkInner}>
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.title}>{t('bookingSentTitle')}</Text>
          <Text style={styles.sub}>
            {t('bookingSentBody', { restaurant: restaurant?.nameKo ?? t('bookingTheRestaurant') })}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <DateBlock iso={params.reservedFor} />
            <View style={styles.flex}>
              <Text style={styles.name}>{restaurant?.nameKo ?? ''}</Text>
              <Text style={styles.muted}>{restaurant?.nameEn ?? ''}</Text>
              <Text style={styles.when}>
                {formatTime(params.reservedFor)} · {peopleLabel(people)}
              </Text>
            </View>
          </View>
          {preorder.lines.length > 0 && (
            <>
              <View style={styles.divider} />
              <PreorderLines lines={preorder.lines} />
              <View style={styles.totalRow}>
                <Text style={styles.total}>{t('bookingPreorderTotal')}</Text>
                <Text style={styles.total}>{won(preorder.totalWon)}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.next}>
          <Text style={styles.heading}>{t('bookingWhatNext')}</Text>
          <View>
            <Step
              state="done"
              title={t('bookingStepSent')}
              sub={t('bookingStepSentSub')}
              last={false}
            />
            <Step
              state="current"
              title={t('bookingStepWaiting')}
              sub={t('bookingStepWaitingSub')}
              last={false}
            />
            <Step
              state="todo"
              title={t('bookingStepAnswer')}
              sub={t('bookingStepAnswerSub')}
              last
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.replace('/(tabs)/reserve')}
          accessibilityRole="button"
          style={styles.primary}>
          <Text style={styles.primaryText}>{t('bookingViewMine')}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>{t('bookingBackToRestaurant')}</Text>
        </Pressable>
        <Text style={styles.footnote}>{t('bookingCancelAnyTime')}</Text>
      </View>
    </SafeAreaView>
  );
}

function Step({
  state,
  title,
  sub,
  last,
}: {
  state: 'done' | 'current' | 'todo';
  title: string;
  sub: string;
  last: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepRail}>
        {state === 'done' ? (
          <View style={[styles.dot, styles.dotDone]}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        ) : state === 'current' ? (
          <View style={[styles.dot, styles.dotCurrent]}>
            <View style={styles.dotCurrentInner} />
          </View>
        ) : (
          <View style={[styles.dot, styles.dotTodo]} />
        )}
        {!last && <View style={[styles.rail, state === 'done' && styles.railDone]} />}
      </View>
      <View style={[styles.stepText, !last && styles.stepGap]}>
        <Text
          style={[
            styles.stepTitle,
            state === 'current' && styles.stepTitleCurrent,
            state === 'todo' && styles.stepTitleTodo,
          ]}>
          {title}
        </Text>
        <Text style={styles.muted}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCF8F5' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, gap: 20 },
  success: { alignItems: 'center', gap: 10 },
  checkOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E3F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 4, color: '#1E1E1E', fontSize: 26, fontWeight: '900' },
  sub: { color: '#6B6460', fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  card: {
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE7E1',
    backgroundColor: '#FFFFFF',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { color: '#1E1E1E', fontSize: 18, fontWeight: '700' },
  muted: { color: '#6B6460', fontSize: 13 },
  when: { marginTop: 4, color: '#1E1E1E', fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F0E9E3' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  total: { color: '#1E1E1E', fontSize: 15, fontWeight: '700' },
  next: { gap: 12 },
  heading: { color: '#1E1E1E', fontSize: 17, fontWeight: '700' },
  step: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: GREEN },
  dotCurrent: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#D79A12' },
  dotCurrentInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D79A12' },
  dotTodo: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#D6CEC7' },
  rail: { flex: 1, width: 2, minHeight: 20, backgroundColor: '#E2DAD3' },
  railDone: { backgroundColor: GREEN },
  stepText: { flex: 1, gap: 2 },
  stepGap: { paddingBottom: 14 },
  stepTitle: { color: '#1E1E1E', fontSize: 15, fontWeight: '700' },
  stepTitleCurrent: { color: '#7A5200' },
  stepTitleTodo: { color: '#4A4440', fontWeight: '600' },
  actions: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 6 },
  primary: { height: 52, borderRadius: 14, backgroundColor: '#1B5FAD', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondary: { height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#1B5FAD', fontSize: 15, fontWeight: '600' },
  footnote: { color: '#6B6460', fontSize: 12, textAlign: 'center' },
});
