import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccount } from '@/hooks/use-account';
import { useTranslation } from '@/hooks/use-translation';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Account settings, opened from the account card on the Profile tab.
export default function AccountScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const account = useAccount();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          hitSlop={8}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
        </Pressable>
        <Text style={styles.title}>{t('accountSettings')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{account.initial}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>{account.displayName}</Text>
          <View style={styles.pills}>
            <View style={styles.modePill}>
              <View style={styles.modeDot} />
              <Text style={styles.modeText}>{account.modeLabel}</Text>
            </View>
            <Text style={styles.status}>{account.statusLabel}</Text>
          </View>
          {account.guest && <Text style={styles.explainer}>{t('guestProfileThisPhone')}</Text>}
        </View>

        {account.guest && (
          // #19: Kakao / Google login is not built yet.
          <View style={styles.card}>
            <Row
              icon="log-in-outline"
              iconBg="#EAF4EC"
              iconColor="#2F6B3F"
              title={t('signInKakaoGoogle')}
              sub={t('keepProfileOnAnyPhone')}
              badge={t('comingSoon')}
            />
          </View>
        )}

        <View style={styles.card}>
          <Row
            icon="swap-horizontal-outline"
            iconBg="#E8F0FB"
            iconColor="#1B5FAD"
            title={account.switchLabel}
            sub={account.switchDescription}
            onPress={() => void account.switchMode()}
          />
        </View>

        {__DEV__ && (
          <View style={{ gap: 8 }}>
            <Text style={styles.sectionLabel}>{t('developerSection')}</Text>
            <View style={[styles.card, styles.devCard]}>
              <Row
                icon="storefront-outline"
                iconBg="#E8F0FB"
                iconColor="#1B5FAD"
                title={t('previewBusinessOwnerPage')}
                sub={t('temporaryPreviewOnlyDevelopment')}
                onPress={() => router.push({ pathname: '/owner', params: { preview: '1' } })}
              />
            </View>
          </View>
        )}

        <View style={[styles.card, styles.signOutCard]}>
          <Row
            icon="log-out-outline"
            iconBg="#FBEBE7"
            iconColor="#B3402A"
            title={t('signOut')}
            titleColor="#B3402A"
            sub={account.signOutDescription}
            onPress={account.confirmSignOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  iconBg,
  iconColor,
  title,
  titleColor = '#1E1E1E',
  sub,
  badge,
  onPress,
}: {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  title: string;
  titleColor?: string;
  sub: string;
  badge?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: titleColor }]}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      {badge ? (
        <Text style={styles.badge}>{badge}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color="#857C76" />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCF8F5' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48, paddingHorizontal: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#1E1E1E', fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32, gap: 18 },
  identity: { alignItems: 'center', gap: 8, paddingTop: 4 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#FCEDE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#D2502F', fontSize: 34, fontWeight: '700' },
  name: { color: '#1E1E1E', fontSize: 20, fontWeight: '700' },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF4EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3E8E55' },
  modeText: { color: '#2F6B3F', fontSize: 12, fontWeight: '600' },
  status: {
    color: '#A9432A',
    backgroundColor: '#FCEDE6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  explainer: { color: '#6B6460', fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 300 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7E1',
    borderRadius: 20,
    overflow: 'hidden',
  },
  devCard: { borderStyle: 'dashed', borderColor: '#C9D6E8' },
  signOutCard: { borderColor: '#F2D9D2' },
  sectionLabel: { marginHorizontal: 4, color: '#6B6460', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  pressed: { backgroundColor: '#F7F2EE' },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub: { color: '#6B6460', fontSize: 12 },
  badge: {
    color: '#5E5752',
    backgroundColor: '#F3EEEA',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
