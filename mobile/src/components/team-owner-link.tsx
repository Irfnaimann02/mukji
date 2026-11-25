import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/hooks/use-translation';
import { isTeamMember } from '@/logic/menu-review';
import { loadPendingOwnerApplications } from '@/logic/team-owner-tools';

// Profile tab: "Owner tools" for the Mukji team only (#118, SQL 043).
// Everyone else never sees this card: the database says who is on the team.
export function TeamOwnerLink() {
  const router = useRouter();
  const { t } = useTranslation();
  const [waiting, setWaiting] = useState<number | null>(null); // null = not team (or still checking)

  // Re-check each time Profile is opened, so the count is fresh after a review.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!(await isTeamMember())) {
          if (active) setWaiting(null);
          return;
        }
        try {
          const applications = await loadPendingOwnerApplications();
          if (active) setWaiting(applications.length);
        } catch {
          if (active) setWaiting(0);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  if (waiting === null) return null;

  return (
    <Pressable
      onPress={() => router.push('/team-owner-tools')}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <Ionicons name="storefront-outline" size={18} color="#4A4440" />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{t('teamOwnerLink')}</Text>
        <Text style={styles.sub}>{t('teamOwnerLinkSub', { count: waiting })}</Text>
      </View>
      {waiting > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{waiting}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color="#857C76" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EFE7E1',
  },
  pressed: { opacity: 0.7 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4EEE9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  title: { color: '#1E1E1E', fontWeight: '700', fontSize: 15 },
  sub: { color: '#857C76', fontSize: 13 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D9472B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
