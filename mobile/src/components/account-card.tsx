import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';

// #45: small "who am I" card. Put <AccountCard /> anywhere, e.g. the Profile tab.
// Text comes from translations.ts (#13).
export function AccountCard() {
  const auth = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const label = !auth.ready
    ? t('signingIn')
    : auth.user === null
      ? t('offlineNoAccount')
      : auth.isAnonymous
        ? t('guestAccount')
        : t('signedInAs', { email: auth.email ?? '' });

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => router.push('/owner-login')} hitSlop={8}>
        <Text style={styles.link}>{auth.isAnonymous ? t('ownerSignInLink') : t('account')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f4f7fa',
  },
  label: { color: '#14213d', fontWeight: '600' },
  link: { color: '#1b5fad', fontWeight: '600' },
});
