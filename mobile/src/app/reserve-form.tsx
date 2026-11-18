import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DishFitPill, usePeopleLabel } from '@/components/booking-parts';
import { createBooking } from '@/data/booking-repository';
import type { Restaurant } from '@/data/types';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/i18n/translations';
import {
  MAX_DISH_QTY,
  NAME_MAX,
  PHONE_MAX,
  REQUEST_MAX,
  encodeNote,
  expandDishIds,
  preorderSummary,
  won,
} from '@/logic/booking-details';
import {
  MAX_PEOPLE,
  MIN_PEOPLE,
  TIME_GROUPS,
  TIME_SLOTS,
  combine,
  formatDay,
  isSlotOpen,
  nextDays,
  weekdayShort,
  type TimeGroup,
} from '@/logic/booking-times';
import { dishStatus } from '@/logic/profile-filter';
import { findRestaurant } from '@/logic/restaurant-service';
import { showAlert } from '@/components/show-alert';
import { userMessage } from '@/logic/user-error';

const BLUE = '#1B5FAD';
const DISHES_SHOWN_FIRST = 5;
const SLOTS_PER_ROW = 4;

const GROUP_LABEL: Record<TimeGroup, TranslationKey> = {
  lunch: 'bookingLunch',
  afternoon: 'bookingAfternoon',
  dinner: 'bookingDinner',
};

// [a, b, c, d, e] -> [[a, b, c, d], [e]]
function rowsOf<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

// #50 Booking request: date, time, number of people and pre-ordered dishes, saved in Supabase.
export default function ReserveFormScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const router = useRouter();
  const { t, language } = useTranslation();
  const { profile } = useProfile();
  const peopleLabel = usePeopleLabel();

  const [restaurant, setRestaurant] = useState<Restaurant | null | undefined>(undefined);

  // "now" is fixed when the screen opens, so the lists do not jump while the user chooses.
  const [now] = useState(() => new Date());
  const days = useMemo(() => nextDays(now), [now]);
  // Start on the first day that still has a free time (late at night that is tomorrow).
  const firstOpenDay = useMemo(() => {
    const index = days.findIndex((day) => TIME_SLOTS.some((slot) => isSlotOpen(day, slot, now)));
    return index === -1 ? 0 : index;
  }, [days, now]);

  const [dayIndex, setDayIndex] = useState(firstOpenDay);
  const [slot, setSlot] = useState<string | null>(null);
  const [people, setPeople] = useState(2);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showAllDishes, setShowAllDishes] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [request, setRequest] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    findRestaurant(restaurantId)
      .then((found) => {
        if (active) setRestaurant(found ?? null);
      })
      .catch(() => {
        if (active) setRestaurant(null);
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const day = days[dayIndex];
  const isToday = dayIndex === 0;

  // Times that have already passed today are hidden, not greyed out.
  const groups = TIME_GROUPS.map((group) => ({
    key: group.key,
    slots: group.slots.filter((s) => isSlotOpen(day, s, now)),
  })).filter((group) => group.slots.length > 0);

  const pickDay = (index: number) => {
    setDayIndex(index);
    // Keep the chosen time only if it is still possible on the new day.
    if (slot && !isSlotOpen(days[index], slot, now)) setSlot(null);
  };

  const setQuantity = (id: string, qty: number) =>
    setQuantities((current) => {
      const next = { ...current };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(MAX_DISH_QTY, qty);
      return next;
    });

  const dishes = restaurant?.dishes ?? [];
  const dishIds = expandDishIds(quantities);
  const preorder = preorderSummary(dishIds, dishes);
  // Show the first few dishes; a dish the user already added always stays visible.
  const visibleDishes = dishes.filter(
    (dish, index) => showAllDishes || index < DISHES_SHOWN_FIRST || (quantities[dish.id] ?? 0) > 0,
  );

  const dayLabel = isToday ? t('bookingToday') : formatDay(day, language);
  const summaryTop = `${dayLabel} · ${slot ?? t('bookingNoTimeYet')} · ${peopleLabel(people)}`;
  const summaryBottom =
    preorder.items === 0
      ? t('bookingNoPreorder')
      : `${preorder.items === 1 ? t('bookingOneDish') : t('bookingDishCount', { count: preorder.items })} · ${won(preorder.totalWon)}`;

  const submit = async () => {
    if (!restaurant || !slot || sending) return;
    if (name.trim() === '' || phone.trim() === '') {
      showAlert(t('bookingContactMissingTitle'), t('bookingContactMissingBody'));
      return;
    }
    const reservedFor = combine(day, slot);
    setSending(true);
    try {
      await createBooking({
        restaurantId: restaurant.id,
        reservedFor,
        people,
        dishIds,
        note: encodeNote({ name, phone, request }),
      });
      router.replace({
        pathname: '/booking-sent',
        params: {
          restaurantId: restaurant.id,
          reservedFor: reservedFor.toISOString(),
          people: String(people),
          dishIds: dishIds.join(','),
        },
      });
    } catch (error) {
      showAlert(t('bookingNotSentTitle'), userMessage(error, t('pleaseTryAgain'), t));
      setSending(false);
    }
  };

  const topBar = (
    <View style={styles.topBar}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        hitSlop={8}
        style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
      </Pressable>
      <Text style={styles.title}>{t('bookingRequestTitle')}</Text>
    </View>
  );

  if (!restaurant || restaurant.source === 'kakao') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        {topBar}
        <Text style={styles.message}>
          {restaurant === undefined
            ? t('loading')
            : restaurant === null
              ? t('restaurantNotFound')
              : // Kakao places are not in our database, so a request could not be saved or answered.
                t('bookingNotForKakao')}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {topBar}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Restaurant */}
          <View style={styles.restaurantRow}>
            <View style={styles.restaurantIcon}>
              <Ionicons name="restaurant-outline" size={24} color="#D2502F" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.restaurantName}>{restaurant.nameKo}</Text>
              <Text style={styles.restaurantSub}>{restaurant.nameEn}</Text>
            </View>
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.heading}>{t('bookingDate')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
              {days.map((d, index) => {
                const on = index === dayIndex;
                return (
                  <Pressable
                    key={d.toISOString()}
                    onPress={() => pickDay(index)}
                    accessibilityRole="button"
                    accessibilityLabel={index === 0 ? t('bookingToday') : formatDay(d, language)}
                    accessibilityState={{ selected: on }}
                    style={[styles.dateCard, on && styles.selected]}>
                    <Text style={[styles.dateTop, on && styles.dateTopOn]} numberOfLines={1}>
                      {index === 0 ? t('bookingToday') : weekdayShort(d, language)}
                    </Text>
                    <Text style={[styles.dateNumber, on && styles.onText]}>{d.getDate()}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Time */}
          <View style={styles.section}>
            <View style={styles.headingRow}>
              <Text style={styles.heading}>{t('bookingTime')}</Text>
              {isToday && <Text style={styles.hint}>{t('bookingEarlierHidden')}</Text>}
            </View>
            {groups.length === 0 && <Text style={styles.hint}>{t('bookingNoTimesLeft')}</Text>}
            {groups.map((group) => (
              <View key={group.key} style={styles.group}>
                <Text style={styles.groupLabel}>{t(GROUP_LABEL[group.key])}</Text>
                {rowsOf(group.slots, SLOTS_PER_ROW).map((row) => (
                  <View key={row[0]} style={styles.slotRow}>
                    {row.map((s) => {
                      const on = slot === s;
                      return (
                        <Pressable
                          key={s}
                          onPress={() => setSlot(on ? null : s)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          style={[styles.slot, on && styles.selected]}>
                          <Text style={[styles.slotText, on && styles.slotTextOn]}>{s}</Text>
                        </Pressable>
                      );
                    })}
                    {/* empty cells keep the last row in 4 columns */}
                    {Array.from({ length: SLOTS_PER_ROW - row.length }, (_, i) => (
                      <View key={`empty-${i}`} style={styles.slotEmpty} />
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* People */}
          <View style={styles.peopleCard}>
            <View>
              <Text style={styles.heading}>{t('bookingPeople')}</Text>
              <Text style={styles.hint}>{t('bookingIncludingYou')}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setPeople((n) => Math.max(MIN_PEOPLE, n - 1))}
                disabled={people <= MIN_PEOPLE}
                accessibilityRole="button"
                accessibilityLabel={t('bookingFewerPeople')}
                style={[styles.stepButton, people <= MIN_PEOPLE && styles.faded]}>
                <Ionicons name="remove" size={20} color={BLUE} />
              </Pressable>
              <Text style={styles.peopleCount}>{peopleLabel(people)}</Text>
              <Pressable
                onPress={() => setPeople((n) => Math.min(MAX_PEOPLE, n + 1))}
                disabled={people >= MAX_PEOPLE}
                accessibilityRole="button"
                accessibilityLabel={t('bookingMorePeople')}
                style={[styles.stepButton, people >= MAX_PEOPLE && styles.faded]}>
                <Ionicons name="add" size={20} color={BLUE} />
              </Pressable>
            </View>
          </View>

          {/* Pre-order */}
          <View style={styles.section}>
            <View style={styles.headingRow}>
              <Text style={styles.heading}>{t('bookingDishes')}</Text>
              <Text style={styles.hint}>{t('bookingOptional')}</Text>
            </View>
            <View style={styles.hintRow}>
              <Ionicons name="shield-outline" size={14} color={BLUE} />
              <Text style={styles.hint}>{t('bookingDishesHint')}</Text>
            </View>
            {dishes.length === 0 ? (
              <Text style={styles.hint}>{t('menuNotAdded')}</Text>
            ) : (
              <View style={styles.dishCard}>
                {visibleDishes.map((dish, index) => {
                  const qty = quantities[dish.id] ?? 0;
                  return (
                    <View key={dish.id} style={[styles.dishRow, index > 0 && styles.dishDivider]}>
                      <View style={styles.flex}>
                        <Text style={styles.dishName}>{dish.nameKo}</Text>
                        <Text style={styles.hint}>{dish.nameEn}</Text>
                        <View style={styles.dishMeta}>
                          <Text style={styles.dishPrice}>{won(dish.priceWon)}</Text>
                          <DishFitPill status={dishStatus(dish, restaurant, profile)} />
                        </View>
                      </View>
                      {qty === 0 ? (
                        <Pressable
                          onPress={() => setQuantity(dish.id, 1)}
                          accessibilityRole="button"
                          accessibilityLabel={`${t('bookingAdd')} ${dish.nameEn}`}
                          style={styles.addButton}>
                          <Ionicons name="add" size={14} color={BLUE} />
                          <Text style={styles.addText}>{t('bookingAdd')}</Text>
                        </Pressable>
                      ) : (
                        <View style={styles.qtyControl}>
                          <Pressable
                            onPress={() => setQuantity(dish.id, qty - 1)}
                            accessibilityRole="button"
                            accessibilityLabel={t('bookingRemoveOne')}
                            style={styles.qtyButton}>
                            <Ionicons name="remove" size={16} color="#FFFFFF" />
                          </Pressable>
                          <Text style={styles.qtyText}>{qty}</Text>
                          <Pressable
                            onPress={() => setQuantity(dish.id, qty + 1)}
                            disabled={qty >= MAX_DISH_QTY}
                            accessibilityRole="button"
                            accessibilityLabel={t('bookingAddOne')}
                            style={[styles.qtyButton, qty >= MAX_DISH_QTY && styles.faded]}>
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
                {dishes.length > DISHES_SHOWN_FIRST && (
                  <Pressable
                    onPress={() => setShowAllDishes((v) => !v)}
                    accessibilityRole="button"
                    style={styles.showAll}>
                    <Text style={styles.showAllText}>
                      {showAllDishes ? t('bookingShowFewer') : t('bookingShowAllDishes', { count: dishes.length })}
                    </Text>
                    <Ionicons name={showAllDishes ? 'chevron-up' : 'chevron-down'} size={16} color={BLUE} />
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Contact */}
          <View style={styles.section}>
            <View>
              <Text style={styles.heading}>{t('bookingContact')}</Text>
              <Text style={styles.hint}>{t('bookingContactHint')}</Text>
            </View>
            <View style={styles.contactRow}>
              <View style={styles.flex}>
                <Text style={styles.label}>{t('bookingName')}</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('bookingNamePlaceholder')}
                  placeholderTextColor="#8F8781"
                  maxLength={NAME_MAX}
                  autoCapitalize="words"
                  editable={!sending}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.label}>{t('bookingPhone')}</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="010-0000-0000"
                  placeholderTextColor="#8F8781"
                  maxLength={PHONE_MAX}
                  keyboardType="phone-pad"
                  editable={!sending}
                />
              </View>
            </View>
            <View>
              <Text style={styles.label}>
                {t('bookingRequestField')} <Text style={styles.labelOptional}>({t('bookingOptional')})</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={request}
                onChangeText={setRequest}
                placeholder={t('bookingRequestPlaceholder')}
                placeholderTextColor="#8F8781"
                maxLength={REQUEST_MAX}
                multiline
                editable={!sending}
              />
            </View>
            <Text style={styles.footnote}>{t('bookingSendHint')}</Text>
          </View>
        </ScrollView>

        {/* Sticky summary bar */}
        <View style={styles.bottomBar}>
          <View style={styles.flex}>
            <Text style={styles.summaryTop} numberOfLines={1}>{summaryTop}</Text>
            <Text style={styles.hint} numberOfLines={1}>{summaryBottom}</Text>
          </View>
          <Pressable
            onPress={() => void submit()}
            disabled={!slot || sending}
            accessibilityRole="button"
            accessibilityState={{ disabled: !slot || sending }}
            style={[styles.send, !slot && styles.sendDisabled, sending && styles.faded]}>
            <Text style={[styles.sendText, !slot && styles.sendTextDisabled]}>
              {sending ? t('pleaseWait') : slot ? t('bookingSend') : t('bookingPickTime')}
            </Text>
            {slot && !sending && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCF8F5' },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 60,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E9E3',
  },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#1E1E1E', fontSize: 20, fontWeight: '700' },
  message: { padding: 24, color: '#6B6460', fontSize: 15 },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24, gap: 24 },
  restaurantRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  restaurantIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FCEDE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantName: { color: '#1E1E1E', fontSize: 22, fontWeight: '900' },
  restaurantSub: { color: '#6B6460', fontSize: 14 },
  section: { gap: 10 },
  heading: { color: '#1E1E1E', fontSize: 17, fontWeight: '700' },
  headingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  hint: { color: '#6B6460', fontSize: 13 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selected: { backgroundColor: BLUE, borderColor: BLUE },
  onText: { color: '#FFFFFF' },
  faded: { opacity: 0.4 },
  dateRow: { gap: 8, paddingRight: 16 },
  dateCard: {
    width: 62,
    height: 70,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2DAD3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dateTop: { color: '#6B6460', fontSize: 12, fontWeight: '600' },
  dateTopOn: { color: 'rgba(255,255,255,0.88)' },
  dateNumber: { color: '#1E1E1E', fontSize: 22, lineHeight: 26, fontWeight: '900' },
  group: { gap: 8 },
  groupLabel: { color: '#6B6460', fontSize: 13, fontWeight: '600' },
  slotRow: { flexDirection: 'row', gap: 8 },
  slot: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2DAD3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: { flex: 1 },
  slotText: { color: '#1E1E1E', fontSize: 15, fontWeight: '500' },
  slotTextOn: { color: '#FFFFFF', fontWeight: '700' },
  peopleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    paddingLeft: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE7E1',
    backgroundColor: '#FFFFFF',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D5E2F3',
    backgroundColor: '#F4F8FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peopleCount: { minWidth: 84, textAlign: 'center', color: '#1E1E1E', fontSize: 17, fontWeight: '700' },
  dishCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE7E1',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingLeft: 14 },
  dishDivider: { borderTopWidth: 1, borderTopColor: '#F0E9E3' },
  dishName: { color: '#1E1E1E', fontSize: 15, fontWeight: '700' },
  dishMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dishPrice: { color: '#1E1E1E', fontSize: 14, fontWeight: '700' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BLUE,
    backgroundColor: '#FFFFFF',
  },
  addText: { color: BLUE, fontSize: 14, fontWeight: '700' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', height: 36, borderRadius: 18, backgroundColor: BLUE },
  qtyButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  qtyText: { minWidth: 18, textAlign: 'center', color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  showAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderTopWidth: 1,
    borderTopColor: '#F0E9E3',
    backgroundColor: '#FBF8F5',
  },
  showAllText: { color: BLUE, fontSize: 14, fontWeight: '700' },
  contactRow: { flexDirection: 'row', gap: 10 },
  label: { color: '#4A4440', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  labelOptional: { color: '#6B6460', fontWeight: '400' },
  input: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2DAD3',
    backgroundColor: '#FFFFFF',
    color: '#1E1E1E',
    fontSize: 15,
  },
  inputMultiline: { height: 88, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
  footnote: { color: '#6B6460', fontSize: 12, lineHeight: 17 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFE7E1',
    backgroundColor: '#FFFFFF',
  },
  summaryTop: { color: '#1E1E1E', fontSize: 14, fontWeight: '700' },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: BLUE,
  },
  sendDisabled: { backgroundColor: '#E9E3DE' },
  sendText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  sendTextDisabled: { color: '#6B6460' },
});
