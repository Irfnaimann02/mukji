import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAccount } from '@/hooks/use-account';
import { useTranslation } from '@/hooks/use-translation';

// Compact account card on the Profile tab. Tap it to open Account settings
// (Business Mode, sign out, owner preview), see app/account.tsx.
export function AccountCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const account = useAccount();

  return (
    <Pressable
      onPress={() => router.push('/account')}
      accessibilityRole="button"
      accessibilityLabel={t('accountSettings')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{account.initial}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.eyebrow}>{t('myMukjiAccount')}</Text>
          <Text style={styles.name} numberOfLines={1}>{account.displayName}</Text>
          <View style={styles.modePill}>
            <View style={styles.modeDot} />
            <Text style={styles.modeText}>{account.modeLabel}</Text>
          </View>
        </View>
        <Text style={styles.status}>{account.statusLabel}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.settingsRow}>
        <View style={styles.settingsIcon}>
          <Ionicons name="person-outline" size={18} color="#4A4440" />
        </View>
        <View style={styles.info}>
          <Text style={styles.settingsTitle}>{t('accountSettings')}</Text>
          <Text style={styles.settingsSub}>{t('accountSettingsSub')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#857C76" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7E1',
    shadowColor: '#3C281E',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pressed: { opacity: 0.85 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FCEDE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#D2502F', fontSize: 26, fontWeight: '700' },
  info: { flex: 1, gap: 3 },
  eyebrow: { color: '#857C76', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  name: { color: '#1E1E1E', fontSize: 18, fontWeight: '700' },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#EAF4EC',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  modeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3E8E55' },
  modeText: { color: '#2F6B3F', fontSize: 12, fontWeight: '600' },
  status: {
    alignSelf: 'flex-start',
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
  divider: { height: 1, backgroundColor: '#F0E9E3' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3EEEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTitle: { color: '#1E1E1E', fontSize: 15, fontWeight: '600' },
  settingsSub: { color: '#6B6460', fontSize: 12 },
});
