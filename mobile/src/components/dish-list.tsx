import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Dish, DishStatus, FoodProfile, Restaurant } from '@/data/types';
import { dishStatus, splitMenu } from '@/logic/profile-filter';

const STATUS: Record<DishStatus, { label: string; color: string }> = {
  safe: { label: 'Safe', color: '#2e7d32' },
  ask_first: { label: 'Ask first', color: '#ef6c00' },
  avoid: { label: 'Avoid', color: '#c62828' },
};

type Props = {
  restaurant: Restaurant;
  profile: FoodProfile;
  onDishPress: (dish: Dish) => void;
};

// The menu on the restaurant page.
// #14: dishes tagged with one of the user's allergens are hidden, with a "Show" link.
export function DishList({ restaurant, profile, onDishPress }: Props) {
  const [showHidden, setShowHidden] = useState(false);

  if (restaurant.dishes.length === 0) {
    return <Text style={styles.sub}>Menu not added yet. Ask staff before ordering.</Text>;
  }

  const { shown, hidden, hiddenBecause } = splitMenu(restaurant, profile);
  const dishes = showHidden ? restaurant.dishes : shown;

  return (
    <View>
      {hidden.length > 0 && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {hidden.length} {hidden.length === 1 ? 'dish' : 'dishes'} hidden for your allergies (
            {hiddenBecause.join(', ')})
          </Text>
          <Pressable onPress={() => setShowHidden(!showHidden)} hitSlop={8}>
            <Text style={styles.noticeLink}>{showHidden ? 'Hide' : 'Show'}</Text>
          </Pressable>
        </View>
      )}

      {shown.length === 0 && !showHidden && (
        <Text style={styles.sub}>Every dish here may have one of your allergens. Ask staff before ordering.</Text>
      )}

      {dishes.map((d) => (
        <DishRow
          key={d.id}
          dish={d}
          status={dishStatus(d, restaurant, profile)}
          onPress={() => onDishPress(d)}
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
  const s = STATUS[status];
  return (
    <Pressable style={styles.dish} onPress={onPress}>
      <View style={styles.dishTop}>
        <Text style={styles.dishName}>
          {dish.nameKo} · ₩{dish.priceWon.toLocaleString()}
        </Text>
        <Text style={[styles.status, { color: s.color, borderColor: s.color }]}>{s.label}</Text>
      </View>
      <Text style={styles.sub}>{dish.nameEn}</Text>
      <Text style={styles.small}>
        Contains: {dish.contains.join(', ') || 'nothing listed'}
        {dish.mayContain.length > 0 ? ` · May contain: ${dish.mayContain.join(', ')}` : ''}
      </Text>
      {status !== 'safe' && dish.leaveOutEn && (
        <Text style={styles.small}>Ask: {dish.leaveOutEn}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sub: { color: '#666' },
  small: { fontSize: 12, color: '#666' },
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
  noticeText: { flex: 1, fontSize: 13, color: '#c62828' },
  noticeLink: { fontSize: 13, fontWeight: '700', color: '#1b5fad' },
  dish: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 2 },
  dishTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dishName: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  status: { fontSize: 12, fontWeight: '700', borderWidth: 1, borderRadius: 8, paddingHorizontal: 6 },
});
