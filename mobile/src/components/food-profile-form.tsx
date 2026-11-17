import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Allergen, Diet, FoodProfile, FoodTag, Ingredient } from '@/data/types';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import { translations, type TranslationKey } from '@/i18n/translations';
import { FOOD_TAGS } from '@/logic/food-tags';
import { nearbyRestaurants } from '@/logic/nearby-service';
import { blockedIngredients } from '@/logic/profile-filter';

type IconName = ComponentProps<typeof Ionicons>['name'];

const BLUE = '#1B5FAD';
const ORANGE_TEXT = '#8A3510';

const DIETS: { key: Diet; label: TranslationKey; icon: IconName }[] = [
  { key: 'halal', label: 'halal', icon: 'ribbon-outline' },
  { key: 'vegan', label: 'vegan', icon: 'leaf-outline' },
  { key: 'no_pork', label: 'noPork', icon: 'ban-outline' },
];

const ALLERGENS: { key: Allergen; label: TranslationKey; emoji: string }[] = [
  { key: 'peanut', label: 'peanut', emoji: '🥜' },
  { key: 'seafood', label: 'seafood', emoji: '🦐' },
  { key: 'egg', label: 'egg', emoji: '🥚' },
  { key: 'dairy', label: 'dairy', emoji: '🥛' },
  { key: 'wheat', label: 'wheat', emoji: '🌾' },
  { key: 'soy', label: 'soy', emoji: '🫘' },
];

// "You avoid" list, in this order. Same rules as profile-filter.ts.
const INGREDIENTS: { key: Ingredient; label: TranslationKey }[] = [
  { key: 'pork', label: 'avoidPork' },
  { key: 'alcohol', label: 'avoidAlcohol' },
  { key: 'beef', label: 'avoidBeef' },
  { key: 'chicken', label: 'avoidChicken' },
  { key: 'lamb', label: 'avoidLamb' },
  { key: 'seafood', label: 'seafood' },
  { key: 'egg', label: 'egg' },
  { key: 'dairy', label: 'dairy' },
  { key: 'peanut', label: 'peanut' },
  { key: 'wheat', label: 'wheat' },
  { key: 'soy', label: 'soy' },
];

// #48 food personality
const FOOD_TAG_LABELS = {
  korean: 'tagKorean',
  chinese: 'tagChinese',
  japanese: 'tagJapanese',
  western: 'tagWestern',
  'asian-foreign': 'tagAsianForeign',
  noodles: 'tagNoodles',
  bbq: 'tagBbq',
  buffet: 'tagBuffet',
  'snack-food': 'tagSnackFood',
  'raw-fish': 'tagRawFish',
  chicken: 'tagChicken',
  'fast-food': 'tagFastFood',
  cafe: 'tagCafe',
  pub: 'tagPub',
  'halal-food': 'tagHalalFood',
  cheap: 'tagCheap',
} as const satisfies Record<FoodTag, TranslationKey>;

// #47: how far to look for restaurants. 1.5 km is the default.
const DISTANCES = [500, 1000, 1500, 3000] as const;

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function FoodProfileForm() {
  const { profile, setProfile } = useProfile();
  const { t } = useTranslation();
  const other = profile.language === 'en' ? 'ko' : 'en';
  const likes = profile.likes ?? [];

  // "Saved" flashes after any change (the profile is saved on the phone straight away).
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(savedTimer.current), []);
  const update = (next: FoodProfile) => {
    setProfile(next);
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
  };

  // "N places nearby fit your profile": same list as Home, without the food-type filter.
  const location = useCurrentLocation();
  const [fitCount, setFitCount] = useState<number | null>(null);
  useEffect(() => {
    if (!location.ready) return;
    let active = true;
    nearbyRestaurants(profile, null, location.point)
      .then((list) => {
        if (active) setFitCount(list.length);
      })
      .catch(() => {
        if (active) setFitCount(null);
      });
    return () => {
      active = false;
    };
  }, [location.ready, location.point, profile]);

  const blocked = blockedIngredients(profile);
  const avoid = INGREDIENTS.filter(({ key }) => blocked.has(key));

  // Halal and vegan already block pork, so "No pork" is shown as included.
  const porkSources = DIETS.filter(({ key }) => key !== 'no_pork' && profile.diets.includes(key));
  const porkIncluded = porkSources.length > 0;

  return (
    <View style={styles.form}>
      {/* Summary */}
      <View style={styles.card}>
        <View style={styles.summaryTop}>
          <Text style={styles.eyebrow}>{t('youAvoid')}</Text>
          {saved && (
            <View style={styles.savedPill}>
              <Ionicons name="checkmark" size={12} color="#0F6B3A" />
              <Text style={styles.savedText}>{t('saved')}</Text>
            </View>
          )}
        </View>
        {avoid.length > 0 ? (
          <View style={styles.wrap}>
            {avoid.map(({ key, label }) => (
              <Text key={key} style={styles.avoidChip}>{t(label)}</Text>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>{t('nothingAvoidedYet')}</Text>
        )}
        <View style={styles.divider} />
        <View style={styles.placesRow}>
          <Ionicons name="location-outline" size={18} color={BLUE} />
          <Text style={styles.placesText}>
            {fitCount === null ? t('checkingNearby') : t('placesNearbyFit', { count: fitCount })}
          </Text>
        </View>
      </View>

      {/* Safety filters: diets + allergies (these hide food) */}
      <View style={[styles.card, styles.safetyCard]}>
        <CardHeader
          icon="shield-checkmark-outline"
          iconBg="#E8F0FB"
          iconColor={BLUE}
          title={t('safetyFilters')}
          sub={t('safetyFiltersSub')}
          badge={<Text style={styles.safetyBadge}>{t('filtersBadge')}</Text>}
        />

        <Text style={styles.subheading}>{t('diet')}</Text>
        <View style={styles.dietRow}>
          {DIETS.map(({ key, label, icon }) => {
            const locked = key === 'no_pork' && porkIncluded;
            const on = !locked && profile.diets.includes(key);
            return (
              <Pressable
                key={key}
                disabled={locked}
                onPress={() => update({ ...profile, diets: toggle(profile.diets, key) })}
                accessibilityRole="switch"
                accessibilityState={{ checked: on || locked, disabled: locked }}
                style={[styles.dietTile, on && styles.selected, locked && styles.dietLocked]}>
                <View style={styles.dietTop}>
                  <Ionicons name={icon} size={24} color={on ? '#FFFFFF' : locked ? '#5E5752' : '#1E1E1E'} />
                  <View style={styles.dietStatus}>
                    {locked && <Ionicons name="lock-closed-outline" size={12} color="#5E5752" />}
                    <Text style={[styles.dietStatusText, on && styles.onText, locked && styles.lockedText]}>
                      {locked ? t('included') : on ? t('toggleOn') : t('toggleOff')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.dietLabel, on && styles.onText, locked && styles.lockedText]}>{t(label)}</Text>
              </Pressable>
            );
          })}
        </View>
        {porkIncluded && (
          <Text style={styles.note}>
            {t('noPorkIncludedIn', { diet: porkSources.map(({ label }) => t(label)).join(' + ') })}
          </Text>
        )}

        <View style={styles.allergyHeader}>
          <Text style={[styles.subheading, { marginTop: 0, marginBottom: 0 }]}>{t('allergies')}</Text>
          {profile.allergens.length > 0 && (
            <Pressable onPress={() => update({ ...profile, allergens: [] })} hitSlop={8} accessibilityRole="button">
              <Text style={styles.linkBlue}>{t('clearAll')}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.allergyGrid}>
          {ALLERGENS.map(({ key, label, emoji }) => {
            const on = profile.allergens.includes(key);
            return (
              <Pressable
                key={key}
                onPress={() => update({ ...profile, allergens: toggle(profile.allergens, key) })}
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                style={[styles.allergyChip, on && styles.selected]}>
                <Text style={styles.emoji}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.allergyLabel, on && styles.onText]}>{t(label)}</Text>
                  <Text style={[styles.allergySub, on && styles.onSubText]}>{translations[other][label]}</Text>
                </View>
                {on && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Food personality (#48): ranking only, never hides anything */}
      <View style={[styles.card, styles.personalityCard]}>
        <CardHeader
          icon="sparkles-outline"
          iconBg="#FFF0E3"
          iconColor="#B8501A"
          title={t('foodPersonality')}
          sub={t('foodPersonalityHint')}
          badge={<Text style={styles.personalityBadge}>{t('rankingOnly')}</Text>}
        />
        <View style={styles.likesRow}>
          <Text style={styles.likesCount}>
            {likes.length > 0 ? t('pickedCount', { count: likes.length }) : t('pickAsManyAsYouLike')}
          </Text>
          {likes.length > 0 && (
            <Pressable onPress={() => update({ ...profile, likes: [] })} hitSlop={8} accessibilityRole="button">
              <Text style={styles.linkOrange}>{t('clear')}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.wrap}>
          {FOOD_TAGS.map((tag) => {
            const on = likes.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => update({ ...profile, likes: toggle(likes, tag) })}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.tagPill, on && styles.tagPillOn]}>
                {on && <Ionicons name="heart" size={13} color={ORANGE_TEXT} />}
                <Text style={[styles.tagText, on && styles.tagTextOn]}>{t(FOOD_TAG_LABELS[tag])}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* App settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('appSettings')}</Text>
        <Text style={styles.settingLabel}>{t('language')}</Text>
        <Segmented
          options={[
            { key: 'en', label: t('english') },
            { key: 'ko', label: t('korean') },
          ]}
          value={profile.language}
          onChange={(language) => update({ ...profile, language: language as FoodProfile['language'] })}
        />
        <Text style={[styles.settingLabel, { marginTop: 8 }]}>{t('searchDistance')}</Text>
        <Segmented
          options={DISTANCES.map((m) => ({ key: String(m), label: m < 1000 ? `${m} m` : `${m / 1000} km` }))}
          value={String(profile.maxDistanceM)}
          onChange={(m) => update({ ...profile, maxDistanceM: Number(m) })}
        />
      </View>
    </View>
  );
}

function CardHeader({
  icon,
  iconBg,
  iconColor,
  title,
  sub,
  badge,
}: {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  badge: ReactNode;
}) {
  return (
    <View style={styles.cardHeader}>
      <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{sub}</Text>
      </View>
      {badge}
    </View>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.segmentItem, on && styles.segmentItemOn]}>
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7E1',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  safetyCard: { borderWidth: 1.5, borderColor: '#CFDDF0', paddingVertical: 18, gap: 0 },
  personalityCard: { borderWidth: 1.5, borderColor: '#F3D9C4', paddingVertical: 18, gap: 14 },
  eyebrow: { color: '#6B6460', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F4EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  savedText: { color: '#0F6B3A', fontSize: 12, fontWeight: '600' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avoidChip: {
    color: '#163F70',
    backgroundColor: '#EAF1FA',
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  muted: { color: '#6B6460', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#F0E9E3' },
  placesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placesText: { color: '#1E1E1E', fontSize: 14, flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#1E1E1E', fontSize: 18, fontWeight: '700' },
  cardSub: { color: '#6B6460', fontSize: 13 },
  safetyBadge: {
    color: '#FFFFFF',
    backgroundColor: BLUE,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  personalityBadge: {
    color: ORANGE_TEXT,
    backgroundColor: '#FFF0E3',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  subheading: { color: '#1E1E1E', fontSize: 15, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  dietRow: { flexDirection: 'row', gap: 10 },
  dietTile: {
    flex: 1,
    height: 104,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2DAD3',
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  selected: { backgroundColor: BLUE, borderColor: BLUE },
  dietLocked: { backgroundColor: '#F4F1EE', borderColor: '#BDB3AB', borderStyle: 'dashed' },
  dietTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dietStatus: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dietStatusText: { color: '#6B6460', fontSize: 12, fontWeight: '700' },
  dietLabel: { color: '#1E1E1E', fontSize: 15, fontWeight: '700' },
  onText: { color: '#FFFFFF' },
  onSubText: { color: 'rgba(255,255,255,0.88)' },
  lockedText: { color: '#5E5752' },
  note: { color: '#6B6460', fontSize: 12, marginTop: 8 },
  allergyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
  },
  linkBlue: { color: BLUE, fontSize: 14, fontWeight: '600' },
  linkOrange: { color: ORANGE_TEXT, fontSize: 14, fontWeight: '600' },
  allergyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  allergyChip: {
    flexBasis: '47%',
    flexGrow: 1,
    height: 56,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2DAD3',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: { fontSize: 20 },
  allergyLabel: { color: '#1E1E1E', fontSize: 15, fontWeight: '600' },
  allergySub: { color: '#6B6460', fontSize: 12 },
  likesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  likesCount: { color: '#6B6460', fontSize: 13, fontWeight: '600' },
  tagPill: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E2DAD3',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagPillOn: { backgroundColor: '#FFF0E3', borderColor: '#E08A52' },
  tagText: { color: '#2A2522', fontSize: 14, fontWeight: '500' },
  tagTextOn: { color: ORANGE_TEXT, fontWeight: '700' },
  settingLabel: { color: '#6B6460', fontSize: 13, fontWeight: '600' },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: '#F3EEEA' },
  segmentItem: { flex: 1, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentItemOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#3C281E',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: { color: '#5E5752', fontSize: 15, fontWeight: '500' },
  segmentTextOn: { color: BLUE, fontWeight: '700' },
});
