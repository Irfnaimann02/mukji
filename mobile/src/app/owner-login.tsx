import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  isValidEmail,
  myOwnedRestaurantIds,
  sendOwnerCode,
  signOut,
  verifyOwnerCode,
} from '@/data/auth';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';

// #45: restaurant owners sign in with email + a code from the email.
// Open it with router.push('/owner-login').
// All text comes from translations.ts (#13), so it follows the language setting.
export default function OwnerLoginScreen() {
  const auth = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ownedList, setOwnedList] = useState<string[]>([]);

  const signedInAsOwner = auth.user !== null && !auth.isAnonymous;
  const owned = signedInAsOwner ? ownedList : [];

  useEffect(() => {
    if (!signedInAsOwner) return;
    myOwnedRestaurantIds()
      .then(setOwnedList)
      .catch(() => setOwnedList([]));
  }, [signedInAsOwner, auth.user?.id]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      // Our own messages are already translated; Supabase's messages stay as Supabase sends them.
      Alert.alert(t('loginAlertTitle'), e instanceof Error ? e.message : t('somethingWentWrong'));
    } finally {
      setBusy(false);
    }
  }

  const onSendCode = () =>
    run(async () => {
      if (!isValidEmail(email)) throw new Error(t('enterValidEmail'));
      await sendOwnerCode(email);
      setCodeSent(true);
    });

  const onVerify = () =>
    run(async () => {
      if (!/^\d{6,10}$/.test(code.trim())) throw new Error(t('enterEmailCode'));
      await verifyOwnerCode(email, code);
      setCode('');
      setCodeSent(false);
    });

  const onSignOut = () => run(signOut);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: t('ownerLoginTitle') }} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {!auth.ready ? (
          <ActivityIndicator />
        ) : signedInAsOwner ? (
          <View style={styles.card}>
            <Text style={styles.title}>{t('signedInAs', { email: auth.email ?? '' })}</Text>
            {owned.length > 0 ? (
              <Text style={styles.sub}>{t('ownerOf', { restaurants: owned.join(', ') })}</Text>
            ) : (
              <Text style={styles.sub}>{t('notLinkedToRestaurant')}</Text>
            )}
            <Pressable style={[styles.button, styles.secondary]} onPress={onSignOut} disabled={busy}>
              <Text style={[styles.buttonText, styles.secondaryText]}>{t('signOut')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>{t('restaurantOwnerQuestion')}</Text>
            <Text style={styles.sub}>{t('ownerLoginDescription')}</Text>

            <TextInput
              style={styles.input}
              placeholder="owner@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!busy && !codeSent}
            />

            {!codeSent ? (
              <Pressable style={styles.button} onPress={onSendCode} disabled={busy}>
                <Text style={styles.buttonText}>{busy ? t('sending') : t('sendCode')}</Text>
              </Pressable>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={t('codePlaceholder')}
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={setCode}
                  editable={!busy}
                />
                <Pressable style={styles.button} onPress={onVerify} disabled={busy}>
                  <Text style={styles.buttonText}>{busy ? t('checking') : t('signIn')}</Text>
                </Pressable>
                <Pressable onPress={() => setCodeSent(false)} disabled={busy} hitSlop={8}>
                  <Text style={styles.link}>{t('useDifferentEmail')}</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {auth.error && <Text style={styles.error}>{auth.error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  card: { padding: 16, gap: 10, borderRadius: 12, backgroundColor: '#f4f7fa' },
  title: { fontSize: 18, fontWeight: '700', color: '#14213d' },
  sub: { color: '#666' },
  input: {
    borderWidth: 1,
    borderColor: '#cfd8e3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondary: { backgroundColor: 'white', borderWidth: 1, borderColor: '#c62828' },
  secondaryText: { color: '#c62828' },
  link: { color: '#1b5fad', textAlign: 'center', marginTop: 4 },
  error: { color: '#c62828' },
});
