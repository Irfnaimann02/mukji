import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { clearAppMode, getAppMode, setAppMode, type AppMode } from '@/data/app-mode';
import { signOutToWelcome } from '@/data/auth';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';

export function AccountCard() {
  const auth = useAuth();
  const router = useRouter();
  const { language } = useTranslation();
  const [mode, setMode] = useState<AppMode>('user');

  useEffect(() => {
    let alive = true;
    getAppMode().then(async (saved) => {
      if (!alive || !auth.ready || !saved) return;
      // A guest may browse in User Mode, but cannot activate Business Mode
      // until they authenticate with an owner/business account.
      if (saved === 'business' && (auth.user === null || auth.isAnonymous)) {
        await setAppMode('user');
        if (alive) setMode('user');
        return;
      }
      setMode(saved);
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [auth.ready, auth.user, auth.isAnonymous]);

  async function switchMode() {
    if (mode === 'business') {
      await setAppMode('user');
      setMode('user');
      router.replace('/(tabs)');
      return;
    }
    if (auth.user === null || auth.isAnonymous) {
      // Do not mark a guest as being in Business Mode. Let them authenticate,
      // with an explicit route back to the regular app if they cancel.
      router.push('/owner-login');
      return;
    }
    await setAppMode('business');
    setMode('business');
    router.replace('/owner');
  }

  const actionLabel = mode === 'business'
    ? (language === 'ko' ? '일반 사용자 모드로 전환' : 'Switch to User Mode')
    : (language === 'ko' ? '사장님 모드로 전환' : 'Switch to Business Mode');

  async function leaveAccount() {
    try {
      // Clear the preference both before and after sign-out. The second clear
      // also removes any key created for a fresh session during auth teardown.
      await clearAppMode();
      await signOutToWelcome();
      await clearAppMode();
      router.replace('/');
    } catch (error) {
      Alert.alert(
        language === 'ko' ? '로그아웃할 수 없습니다' : 'Could not log out',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }

  function confirmLeaveAccount() {
    const guest = auth.isAnonymous || auth.user === null;
    Alert.alert(
      language === 'ko' ? '로그아웃할까요?' : 'Sign out?',
      guest
        ? (language === 'ko' ? '게스트 세션을 종료하고 MUKJI 시작 화면으로 이동합니다.' : 'Your guest session will end and you will return to the MUKJI welcome screen.')
        : (language === 'ko' ? '계정에서 로그아웃하고 MUKJI 시작 화면으로 이동합니다.' : 'You will be signed out and returned to the MUKJI welcome screen.'),
      [
        { text: language === 'ko' ? '취소' : 'Cancel', style: 'cancel' },
        {
          text: language === 'ko' ? '로그아웃' : 'Sign Out',
          style: 'destructive',
          onPress: () => void leaveAccount(),
        },
      ],
    );
  }

  const guest = auth.isAnonymous || auth.user === null;
  const displayName = guest ? 'Guest account' : (auth.email ?? 'MUKJI member');
  const modeLabel = mode === 'business' ? 'Business Mode' : 'User Mode';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{guest ? 'G' : (auth.email?.[0]?.toUpperCase() ?? 'M')}</Text>
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.eyebrow}>MY MUKJI ACCOUNT</Text>
          <Text style={styles.label} numberOfLines={1}>{displayName}</Text>
          <View style={styles.modePill}>
            <View style={styles.modeDot} />
            <Text style={styles.mode}>{modeLabel}</Text>
          </View>
        </View>
        <View style={styles.statusIcon}>
          <Text style={styles.statusIconText}>{guest ? 'GUEST' : 'MEMBER'}</Text>
        </View>
      </View>

      <View style={styles.divider} />
      <Pressable onPress={() => void switchMode()} style={styles.actionRow} accessibilityRole="button">
        <View style={styles.actionIcon}>
          <Text style={styles.actionIconText}>⇄</Text>
        </View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>{actionLabel}</Text>
          <Text style={styles.actionDescription}>{mode === 'business' ? 'Browse MUKJI as a customer' : 'Manage your restaurant with MUKJI Partners'}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable onPress={confirmLeaveAccount} style={[styles.actionRow, styles.signOutRow]} accessibilityRole="button">
        <View style={styles.signOutIcon}>
          <Text style={styles.signOutIconText}>↪</Text>
        </View>
        <View style={styles.actionCopy}>
          <Text style={styles.signOutTitle}>Sign Out</Text>
          <Text style={styles.actionDescription}>{guest ? 'End guest session and return to welcome' : 'Sign out of your MUKJI account'}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0E8E2', shadowColor: '#49352D', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFF0EA', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#F15A3B', fontSize: 23, fontWeight: '900' },
  accountInfo: { flex: 1, gap: 4 },
  eyebrow: { color: '#A49A94', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  label: { color: '#202124', fontWeight: '900', fontSize: 15 },
  modePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, backgroundColor: '#F4F7F4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, marginTop: 2 },
  modeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#23845D' },
  mode: { color: '#47715C', fontSize: 10, fontWeight: '800' },
  statusIcon: { backgroundColor: '#FFF5F0', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  statusIconText: { color: '#B85A42', fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  divider: { height: 1, backgroundColor: '#F1EAE5', marginTop: 17, marginBottom: 5 },
  actionRow: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9 },
  actionIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center' },
  actionIconText: { color: '#3767A4', fontSize: 22, fontWeight: '700' },
  actionCopy: { flex: 1, gap: 3 },
  actionTitle: { color: '#202124', fontSize: 13, fontWeight: '900' },
  actionDescription: { color: '#8A8581', fontSize: 10, lineHeight: 14 },
  chevron: { color: '#B2AAA5', fontSize: 25, fontWeight: '300', paddingHorizontal: 3 },
  signOutRow: { borderTopWidth: 1, borderTopColor: '#F5EFEB' },
  signOutIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  signOutIconText: { color: '#C44335', fontSize: 21, fontWeight: '700' },
  signOutTitle: { color: '#C44335', fontSize: 13, fontWeight: '900' },
});
