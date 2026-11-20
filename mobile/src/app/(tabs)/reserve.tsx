import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateBlock, PreorderLines, usePeopleLabel } from '@/components/booking-parts';
import { BookingStatusPill } from '@/components/booking-status-pill';
import { cancelBooking, listMyBookings, type Booking } from '@/data/booking-repository';
import type { Restaurant } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import { preorderSummary, won } from '@/logic/booking-details';
import { formatTime } from '@/logic/booking-times';
import { openDirections } from '@/logic/directions';
import { listRestaurants } from '@/logic/restaurant-service';
import { showAlert } from '@/components/show-alert';

const BLUE = '#1B5FAD';
const GREEN = '#2E8A55';
const UNDO_MS = 5000;

type Tab = 'ongoing' | 'history';

// #50 Reservation tab: the user's booking requests (saved in Supabase).
// Ongoing = waiting or confirmed. History = visited, declined or cancelled.
export default function ReserveScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const peopleLabel = usePeopleLabel();

  const [tab, setTab] = useState<Tab>('ongoing');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [collapsed, setCollapsed] = useState<string[]>([]); // bookings whose pre-order list is closed
  const [confirmingId, setConfirmingId] = useState<string | null>(null); // "Are you sure?" is open
  // Cancel with Undo: the booking leaves the list at once, but the cancel is only
  // sent to Supabase when the toast runs out or the user leaves this tab.
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [cancelFailed, setCancelFailed] = useState(false);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [mine, all] = await Promise.all([listMyBookings(), listRestaurants()]);
      setBookings(mine);
      setRestaurants(all);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendPendingCancel = useCallback(() => {
    clearTimeout(timerRef.current);
    const id = pendingRef.current;
    pendingRef.current = null;
    setPendingCancelId(null);
    if (!id) return;
    cancelBooking(id)
      .then((updated) => setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b))))
      .catch(() => setCancelFailed(true));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      // Leaving the tab: a cancel that is still waiting for Undo is sent now.
      return () => sendPendingCancel();
    }, [refresh, sendPendingCancel]),
  );

  const startCancel = (id: string) => {
    sendPendingCancel(); // an earlier one, if any
    setConfirmingId(null);
    setCancelFailed(false);
    pendingRef.current = id;
    setPendingCancelId(id);
    timerRef.current = setTimeout(sendPendingCancel, UNDO_MS);
  };

  const undoCancel = () => {
    clearTimeout(timerRef.current);
    pendingRef.current = null;
    setPendingCancelId(null);
  };

  const call = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() =>
      showAlert(t('unableToOpenPhone'), t('tryAgainOrCopy')),
    );
  };

  const directions = (restaurant: Restaurant) => {
    const to = { name: restaurant.nameKo, lat: restaurant.lat, lng: restaurant.lng };
    showAlert(t('directions'), t('directionsMessage'), [
      { text: t('naverMap'), onPress: () => void openDirections('naver', to) },
      { text: t('kakaoMap'), onPress: () => void openDirections('kakao', to) },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const isOngoing = (b: Booking) => b.status === 'requested' || b.status === 'confirmed';
  const ongoing = bookings.filter((b) => isOngoing(b) && b.id !== pendingCancelId);
  // Newest first in History.
  const past = bookings.filter((b) => !isOngoing(b)).reverse();

  const renderOngoing = (booking: Booking) => {
    const restaurant = restaurants.find((r) => r.id === booking.restaurantId);
    const preorder = preorderSummary(booking.dishIds, restaurant?.dishes ?? []);
    const open = !collapsed.includes(booking.id);
    const confirmed = booking.status === 'confirmed';
    const phone = restaurant?.phone?.trim() ?? '';

    return (
      <View key={booking.id} style={styles.card}>
        <View style={styles.cardTop}>
          <DateBlock iso={booking.reservedFor} />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={2}>
                {restaurant?.nameKo ?? booking.restaurantId}
              </Text>
              <BookingStatusPill status={booking.status} />
            </View>
            {restaurant && <Text style={styles.muted}>{restaurant.nameEn}</Text>}
            <View style={styles.whenRow}>
              <Ionicons name="time-outline" size={16} color="#6B6460" />
              <Text style={styles.when}>{formatTime(booking.reservedFor)}</Text>
              <Text style={styles.dot}>·</Text>
              <Ionicons name="people-outline" size={16} color="#6B6460" />
              <Text style={styles.when}>{peopleLabel(booking.people)}</Text>
            </View>
          </View>
        </View>

        {/* Sent -> Waiting for restaurant -> Confirmed */}
        <View style={styles.timeline}>
          <View style={styles.timelineRow}>
            <View style={[styles.timelineLine, styles.timelineLineLeft, styles.timelineLineDone]} />
            <View style={[styles.timelineLine, styles.timelineLineRight, confirmed && styles.timelineLineDone]} />
            <TimelineStep state="done" label={t('bookingStepSentShort')} />
            <TimelineStep state={confirmed ? 'done' : 'current'} label={t('bookingStepWaitingShort')} />
            <TimelineStep state={confirmed ? 'done' : 'todo'} label={t('bookingStatusConfirmed')} />
          </View>
          <Text style={styles.timelineNote}>
            {confirmed ? t('bookingConfirmedNote') : t('bookingWaitingNote')}
          </Text>
        </View>

        {preorder.lines.length > 0 && (
          <View style={styles.preorder}>
            <Pressable
              onPress={() =>
                setCollapsed((current) =>
                  open ? [...current, booking.id] : current.filter((id) => id !== booking.id),
                )
              }
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              style={styles.preorderHeader}>
              <Text style={styles.preorderTitle}>
                {t('bookingPreorder')} ·{' '}
                {preorder.items === 1 ? t('bookingOneItem') : t('bookingItemCount', { count: preorder.items })}
              </Text>
              <View style={styles.preorderTotal}>
                <Text style={styles.preorderTitle}>{won(preorder.totalWon)}</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#6B6460" />
              </View>
            </Pressable>
            {open && <PreorderLines lines={preorder.lines} />}
          </View>
        )}

        <View style={styles.divider} />

        {confirmingId === booking.id ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>
              {t('bookingCancelAt', { restaurant: restaurant?.nameKo ?? '' })}
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable onPress={() => setConfirmingId(null)} accessibilityRole="button" style={styles.keep}>
                <Text style={styles.keepText}>{t('bookingKeep')}</Text>
              </Pressable>
              <Pressable
                onPress={() => startCancel(booking.id)}
                accessibilityRole="button"
                style={styles.cancelNow}>
                <Text style={styles.cancelNowText}>{t('bookingCancel')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            {phone !== '' && (
              <Pressable onPress={() => call(phone)} accessibilityRole="button" style={styles.action}>
                <Ionicons name="call-outline" size={16} color={BLUE} />
                <Text style={styles.actionText}>{t('call')}</Text>
              </Pressable>
            )}
            {restaurant && (
              <Pressable onPress={() => directions(restaurant)} accessibilityRole="button" style={styles.action}>
                <Ionicons name="navigate-outline" size={16} color={BLUE} />
                <Text style={styles.actionText}>{t('directions')}</Text>
              </Pressable>
            )}
            <View style={styles.flex} />
            <Pressable
              onPress={() => setConfirmingId(booking.id)}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>{t('cancel')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  const renderHistory = (booking: Booking) => {
    const restaurant = restaurants.find((r) => r.id === booking.restaurantId);
    return (
      <View key={booking.id} style={styles.historyRow}>
        <DateBlock iso={booking.reservedFor} small muted />
        <View style={styles.flex}>
          <Text style={styles.historyName} numberOfLines={1}>
            {restaurant?.nameKo ?? booking.restaurantId}
          </Text>
          <Text style={styles.muted}>
            {formatTime(booking.reservedFor)} · {peopleLabel(booking.people)}
          </Text>
          {booking.cancelledBy === 'restaurant' && (
            <Text style={styles.muted}>{t('bookingCancelledByRestaurant')}</Text>
          )}
          {booking.status === 'completed' && (
            <Pressable
              onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: booking.restaurantId } })}
              accessibilityRole="link"
              hitSlop={6}>
              <Text style={styles.reviewLink}>{t('bookingWriteReview')}</Text>
            </Pressable>
          )}
        </View>
        <BookingStatusPill status={booking.status} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('reservation')}</Text>
          <Text style={styles.subtitle}>{t('bookingTabSubtitle')}</Text>
        </View>

        <View style={styles.segment} accessibilityRole="tablist">
          <Pressable
            onPress={() => setTab('ongoing')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'ongoing' }}
            style={[styles.segmentItem, tab === 'ongoing' && styles.segmentItemOn]}>
            <Text style={[styles.segmentText, tab === 'ongoing' && styles.segmentTextOn]}>{t('ongoing')}</Text>
            {ongoing.length > 0 && <Text style={styles.count}>{ongoing.length}</Text>}
          </Pressable>
          <Pressable
            onPress={() => setTab('history')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'history' }}
            style={[styles.segmentItem, tab === 'history' && styles.segmentItemOn]}>
            <Text style={[styles.segmentText, tab === 'history' && styles.segmentTextOn]}>{t('history')}</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={styles.spinner} />
        ) : error ? (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={42} color="#857C76" />
            <Text style={styles.emptyText}>{t('couldNotLoadReservations')}</Text>
            <Pressable onPress={() => void refresh()} accessibilityRole="button" style={styles.findButton}>
              <Text style={styles.findText}>{t('tryAgain')}</Text>
            </Pressable>
          </View>
        ) : tab === 'ongoing' ? (
          <View style={styles.list}>
            {ongoing.map(renderOngoing)}

            {ongoing.length === 0 && (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="calendar-outline" size={40} color={BLUE} />
                </View>
                <Text style={styles.emptyTitle}>{t('bookingNoneNow')}</Text>
                <Text style={styles.emptyText}>{t('bookingNoneNowBody')}</Text>
                <Pressable
                  onPress={() => router.push('/search')}
                  accessibilityRole="button"
                  style={styles.findButton}>
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                  <Text style={styles.findText}>{t('bookingFindRestaurant')}</Text>
                </Pressable>
              </View>
            )}

            {pendingCancelId !== null && (
              <View style={styles.toast} accessibilityRole="alert">
                <Text style={styles.toastText}>{t('bookingCancelledToast')}</Text>
                <Pressable onPress={undoCancel} accessibilityRole="button" hitSlop={8}>
                  <Text style={styles.undo}>{t('bookingUndo')}</Text>
                </Pressable>
              </View>
            )}
            {cancelFailed && <Text style={styles.failed}>{t('bookingCancelFailed')}</Text>}
          </View>
        ) : (
          <View style={styles.historyList}>
            {past.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{t('bookingNoHistory')}</Text>
              </View>
            ) : (
              past.map(renderHistory)
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineStep({ state, label }: { state: 'done' | 'current' | 'todo'; label: string }) {
  return (
    <View style={styles.timelineStep}>
      {state === 'done' ? (
        <View style={[styles.stepDot, styles.stepDotDone]}>
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        </View>
      ) : state === 'current' ? (
        <View style={[styles.stepDot, styles.stepDotCurrent]}>
          <View style={styles.stepDotInner} />
        </View>
      ) : (
        <View style={[styles.stepDot, styles.stepDotTodo]} />
      )}
      <Text
        style={[
          styles.stepLabel,
          state === 'current' && styles.stepLabelCurrent,
          state === 'todo' && styles.stepLabelTodo,
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCF8F5' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32, gap: 18 },
  header: { gap: 4 },
  title: { color: '#1E1E1E', fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: '#6B6460', fontSize: 14 },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: '#F3EEEA' },
  segmentItem: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentItemOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#3C281E',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: { color: '#5E5752', fontSize: 15, fontWeight: '700' },
  segmentTextOn: { color: BLUE },
  count: {
    minWidth: 20,
    height: 20,
    lineHeight: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: BLUE,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  spinner: { marginTop: 48 },
  list: { gap: 14 },
  card: {
    gap: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE7E1',
    backgroundColor: '#FFFFFF',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, color: '#1E1E1E', fontSize: 18, fontWeight: '700' },
  muted: { color: '#6B6460', fontSize: 13 },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  when: { color: '#1E1E1E', fontSize: 15, fontWeight: '600' },
  dot: { color: '#BDB3AB' },
  timeline: { gap: 10, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 8, borderRadius: 14, backgroundColor: '#FBF8F5' },
  timelineRow: { flexDirection: 'row' },
  timelineLine: { position: 'absolute', top: 11, height: 2, width: '33.3%', backgroundColor: '#E2DAD3' },
  timelineLineLeft: { left: '16.6%' },
  timelineLineRight: { left: '50%' },
  timelineLineDone: { backgroundColor: GREEN },
  timelineStep: { flex: 1, alignItems: 'center', gap: 6 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: GREEN },
  stepDotCurrent: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#D79A12' },
  stepDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D79A12' },
  stepDotTodo: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#D6CEC7' },
  stepLabel: { color: '#1E1E1E', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  stepLabelCurrent: { color: '#7A5200', fontWeight: '700' },
  stepLabelTodo: { color: '#6B6460', fontWeight: '500' },
  timelineNote: { marginHorizontal: 8, color: '#6B6460', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  preorder: { gap: 8 },
  preorderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  preorderTitle: { color: '#1E1E1E', fontSize: 14, fontWeight: '700' },
  preorderTotal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { height: 1, backgroundColor: '#F0E9E3' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5E2F3',
    backgroundColor: '#F4F8FD',
  },
  actionText: { color: BLUE, fontSize: 14, fontWeight: '600' },
  cancelLink: { height: 40, paddingHorizontal: 6, justifyContent: 'center' },
  cancelLinkText: { color: '#B3402A', fontSize: 14, fontWeight: '600' },
  confirmBox: { gap: 10, padding: 12, borderRadius: 14, backgroundColor: '#FBEBE7' },
  confirmText: { color: '#7E2A1A', fontSize: 14, fontWeight: '600' },
  confirmButtons: { flexDirection: 'row', gap: 8 },
  keep: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2DAD3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepText: { color: '#1E1E1E', fontSize: 14, fontWeight: '600' },
  cancelNow: { flex: 1, height: 40, borderRadius: 12, backgroundColor: '#B3402A', alignItems: 'center', justifyContent: 'center' },
  cancelNowText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 16 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F0FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: '#1E1E1E', fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#6B6460', fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 280 },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    marginTop: 6,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: BLUE,
  },
  findText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#2A2522',
  },
  toastText: { color: '#FFFFFF', fontSize: 14 },
  undo: { color: '#9CC3F5', fontSize: 14, fontWeight: '700', paddingVertical: 8, paddingHorizontal: 4 },
  failed: { color: '#B3402A', fontSize: 13, textAlign: 'center' },
  historyList: { gap: 10 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE7E1',
    backgroundColor: '#FFFFFF',
  },
  historyName: { color: '#1E1E1E', fontSize: 15, fontWeight: '700' },
  reviewLink: { marginTop: 2, color: BLUE, fontSize: 13, fontWeight: '600' },
});
