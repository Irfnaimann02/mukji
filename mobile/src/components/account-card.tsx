import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/hooks/use-auth';

// #45: small "who am I" card. Put <AccountCard /> anywhere, e.g. the Profile tab.
export function AccountCard() {
  const auth = useAuth();
  const router = useRouter();

  const label = !auth.ready
    ? 'Signing in...'
    : auth.user === null
      ? 'Offline (no account)'
      : auth.isAnonymous
        ? 'Guest account'
        : `Signed in as ${auth.email}`;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => router.push('/owner-login')} hitSlop={8}>
        <Text style={styles.link}>{auth.isAnonymous ? 'Restaurant owner? Sign in' : 'Account'}</Text>
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
