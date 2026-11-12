import { CategoryHintCard } from '@/components/category-hint-card';
import { TrustBadge } from '@/components/trust-badge';
import { dishTrust } from '@/logic/trust-score';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  Dish,
  DishStatus,
  FoodProfile,
  Restaurant,
} from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import { dishStatus, splitMenu } from '@/logic/profile-filter';

const STATUS: Record<
  DishStatus,
  {
    label: 'safe' | 'askFirst' | 'avoid';
    color: string;
  }
> = {
  safe: {
    label: 'safe',
    color: '#2e7d32',
  },
  ask_first: {
    label: 'askFirst',
    color: '#ef6c00',
  },
  avoid: {
    label: 'avoid',
    color: '#c62828',
  },
};

type Props = {
  restaurant: Restaurant;
  profile: FoodProfile;
  onDishPress: (dish: Dish) => void;
};

export function DishList({
  restaurant,
  profile,
  onDishPress,
}: Props) {
  const [showHidden, setShowHidden] = useState(false);
  const { t } = useTranslation();

  if (restaurant.dishes.length === 0) {
    // #47: no menu yet, so show what this type of restaurant usually uses (always Ask first).
    if (restaurant.categoryHint) {
      return <CategoryHintCard hint={restaurant.categoryHint} />;
    }
    return <Text style={styles.sub}>{t('menuNotAdded')}</Text>;
  }

  const { shown, hidden, hiddenBecause } = splitMenu(
    restaurant,
    profile
  );

  const dishes = showHidden ? restaurant.dishes : shown;

  return (
    <View>
      {hidden.length > 0 && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {t('hiddenForAllergies', { count: hidden.length })}
            {hiddenBecause.length > 0
              ? ` (${hiddenBecause.join(', ')})`
              : ''}
          </Text>

          <Pressable
            onPress={() => setShowHidden((previous) => !previous)}
            hitSlop={8}>
            <Text style={styles.noticeLink}>
              {showHidden ? t('hide') : t('show')}
            </Text>
          </Pressable>
        </View>
      )}

      {shown.length === 0 && !showHidden && (
        <Text style={styles.sub}>
          {t('everyDishMayContain')}
        </Text>
      )}

      {dishes.map((dish) => (
        <DishRow
          key={dish.id}
          dish={dish}
          status={dishStatus(dish, restaurant, profile)}
          onPress={() => onDishPress(dish)}
        />
      ))}
    </View>
  );
}

function DishRow({
  dish,
  status,
  onPress,
}: {
  dish: Dish;
  status: DishStatus;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const statusInfo = STATUS[status];

  return (
    <Pressable style={styles.dish} onPress={onPress}>
      <View style={styles.dishTop}>
        <Text style={styles.dishName}>
          {dish.nameKo} · ₩{dish.priceWon.toLocaleString()}
        </Text>

        <Text
          style={[
            styles.status,
            {
              color: statusInfo.color,
              borderColor: statusInfo.color,
            },
          ]}>
          {t(statusInfo.label)}
        </Text>
      </View>

      <Text style={styles.sub}>{dish.nameEn}</Text>

      <Text style={styles.small}>
        {t('contains')}: {dish.contains.join(', ') || t('nothingListed')}
        {dish.mayContain.length > 0
          ? ` · ${t('mayContain')}: ${dish.mayContain.join(', ')}`
          : ''}
      </Text>

      {status !== 'safe' && dish.leaveOutEn && (
        <Text style={styles.small}>
          {t('ask')}: {dish.leaveOutEn}
        </Text>
      )}
    <DishTrustLine dish={dish} />
    </Pressable>
  );
}

// #8: confidence pill, how many people checked the dish, and when.
function DishTrustLine({ dish }: { dish: Dish }) {
  const { t, language } = useTranslation();
  const trust = dishTrust(dish);

  return (
    <View style={styles.trustRow}>
      <TrustBadge confidence={trust.confidence} />
      <Text style={styles.small}>
        {trust.verifiedCount === 0
          ? t('notVerifiedYet')
          : t('verifiedBy', { count: trust.verifiedCount })}
        {dish.lastChecked
          ? ` · ${t('lastChecked')} ${formatDate(dish.lastChecked, language)}`
          : ''}
      </Text>
    </View>
  );
}

function formatDate(date: string, language: 'ko' | 'en'): string {
  return new Date(date).toLocaleDateString(
    language === 'ko' ? 'ko-KR' : 'en-GB',
    { day: 'numeric', month: 'short' }
  );
}

const styles = StyleSheet.create({
  sub: {
    color: '#666',
  },
  small: {
    fontSize: 12,
    color: '#666',
  },
  notice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: '#fdecea',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#c62828',
  },
  noticeLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1b5fad',
  },
  dish: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 2,
  },
  dishTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dishName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
});
