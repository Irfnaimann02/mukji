import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PreorderLines, usePeopleLabel } from '@/components/booking-parts';
import { BookingStatusPill } from '@/components/booking-status-pill';
import {
  listBookingsForRestaurants,
  respondToBooking,
  type Booking,
  type BookingStatus,
} from '@/data/booking-repository';
import type { Restaurant } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import { decodeNote, preorderSummary, won } from '@/logic/booking-details';
import { formatBookingTime, isInFuture } from '@/logic/booking-times';
import { showAlert } from '@/components/show-alert';
import { userMessage } from '@/logic/user-error';

const BLUE = '#1b5fad';

// Requests that still need the owner come first.
const ORDER: BookingStatus[] = ['requested', 'confirmed', 'cancelled', 'declined', 'completed'];

// #50 Owner portal: booking requests for the owner's restaurants.
// A booking the customer cancelled is shown as an alert at the top.
export function OwnerReservations({ restaurants }: { restaurants: Restaurant[] }) {
  const { t, language } = useTranslation();
  const peopleLabel = usePeopleLabel();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const idsKey = restaurants.map((r) => r.id).join(',');

  // Bumped by the Refresh button to load the list again.
  const [reloadKey, setReloadKey] = useState(0);

  // State is only set when the request finishes (not straight away in the effect),
  // so React does not render twice in a row.
  useEffect(() => {
    let active = true;
    listBookingsForRestaurants(idsKey === '' ? [] : idsKey.split(','))
      .then((list) => {
        if (!active) return;
        setBookings(list);
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [idsKey, reloadKey]);

  const refresh = () => {
    setLoading(true);
    setError(false);
    setReloadKey((key) => key + 1);
  };

  const respond = async (booking: Booking, status: 'confirmed' | 'declined' | 'completed') => {
    setBusyId(booking.id);
    try {
      const updated = await respondToBooking(booking.id, status);
      setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)));
    } catch (e) {
      showAlert(t('updateFailed'), userMessage(e, t('pleaseTryAgain'), t));
    } finally {
      setBusyId(null);
    }
  };

  const now = new Date();
  const cancelledUpcoming = bookings.filter((b) => b.status === 'cancelled' && isInFuture(b.reservedFor, now));
  const sorted = [...bookings].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.reservedFor.localeCompare(b.reservedFor),
  );

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('bookingOwnerTitle')}</Text>
        <Pressable onPress={refresh} accessibilityRole="button" hitSlop={8} style={styles.refresh}>
          <Ionicons name="refresh" size={16} color={BLUE} />
          <Text style={styles.refreshText}>{t('bookingRefresh')}</Text>
        </Pressable>
      </View>

      {cancelledUpcoming.length > 0 && (
        <View style={styles.alert} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={20} color="#B3402A" />
          <View style={styles.flex}>
            <Text style={styles.alertTitle}>{t('bookingOwnerCancelAlert', { count: cancelledUpcoming.length })}</Text>
            {cancelledUpcoming.map((b) => (
              <Text key={b.id} style={styles.alertLine}>
                {formatBookingTime(b.reservedFor, language)} · {peopleLabel(b.people)}
              </Text>
            ))}
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={BLUE} style={styles.spinner} />
      ) : error ? (
        <Text style={styles.muted}>{t('couldNotLoadReservations')}</Text>
      ) : sorted.length === 0 ? (
        <Text style={styles.muted}>{t('bookingOwnerNone')}</Text>
      ) : (
        sorted.map((booking) => {
          const restaurant = restaurants.find((r) => r.id === booking.restaurantId);
          const preorder = preorderSummary(booking.dishIds, restaurant?.dishes ?? []);
          const contact = decodeNote(booking.note);
          const busy = busyId === booking.id;
          return (
            <View key={booking.id} style={[styles.card, booking.status === 'cancelled' && styles.cardCancelled]}>
              <View style={styles.cardTop}>
                <Text style={styles.time}>{formatBookingTime(booking.reservedFor, language)}</Text>
                <BookingStatusPill status={booking.status} />
              </View>
              <Text style={styles.line}>
                {peopleLabel(booking.people)}
                {restaurants.length > 1 && restaurant ? ` · ${restaurant.nameKo}` : ''}
              </Text>
              {(contact.name !== '' || contact.phone !== '') && (
                <Text style={styles.muted}>
                  {[contact.name, contact.phone].filter(Boolean).join(' · ')}
                </Text>
              )}
              {contact.request !== '' && (
                <Text style={styles.muted}>
                  {t('bookingRequestField')}: {contact.request}
                </Text>
              )}
              {preorder.lines.length > 0 && (
                <View style={styles.preorder}>
                  <PreorderLines lines={preorder.lines} />
                  <Text style={styles.line}>
                    {t('bookingPreorderTotal')}: {won(preorder.totalWon)}
                  </Text>
                </View>
              )}
              {booking.status === 'requested' && (
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => void respond(booking, 'confirmed')}
                    disabled={busy}
                    accessibilityRole="button"
                    style={[styles.action, styles.confirm, busy && styles.busy]}>
                    <Text style={styles.confirmText}>{t('bookingConfirm')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void respond(booking, 'declined')}
                    disabled={busy}
                    accessibilityRole="button"
                    style={[styles.action, styles.decline, busy && styles.busy]}>
                    <Text style={styles.declineText}>{t('bookingDecline')}</Text>
                  </Pressable>
                </View>
              )}
              {booking.status === 'confirmed' && (
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => void respond(booking, 'completed')}
                    disabled={busy}
                    accessibilityRole="button"
                    style={[styles.action, styles.confirm, busy && styles.busy]}>
                    <Text style={styles.confirmText}>{t('bookingMarkCompleted')}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#14213d', fontSize: 18, fontWeight: '700' },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshText: { color: BLUE, fontWeight: '600' },
  alert: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F2D9D2',
    backgroundColor: '#FBEBE7',
  },
  alertTitle: { color: '#B3402A', fontWeight: '700' },
  alertLine: { color: '#5E5752', fontSize: 13, marginTop: 2 },
  spinner: { marginTop: 24 },
  muted: { color: '#6B6460', fontSize: 13 },
  card: {
    gap: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe3ec',
    backgroundColor: '#FFFFFF',
  },
  cardCancelled: { borderColor: '#F2D9D2' },
  preorder: { gap: 6, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EEF2F6' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  time: { flex: 1, color: '#14213d', fontSize: 16, fontWeight: '700' },
  line: { color: '#14213d', fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  action: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  confirm: { backgroundColor: BLUE },
  confirmText: { color: '#FFFFFF', fontWeight: '700' },
  decline: { borderWidth: 1, borderColor: '#F2D9D2', backgroundColor: '#FFFFFF' },
  declineText: { color: '#B3402A', fontWeight: '700' },
  busy: { opacity: 0.5 },
});
