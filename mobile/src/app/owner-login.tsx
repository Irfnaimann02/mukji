import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
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
  sendEmailCode,
  signOut,
  verifyEmailCode,
} from '@/data/auth';
import { setAppMode } from '@/data/app-mode';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';

export default function OwnerLoginScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { t, language } = useTranslation();
  const isKo = language === 'ko';
  const copy = (en: string, ko: string) => (isKo ? ko : en);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ownedList, setOwnedList] = useState<string[]>([]);

  const signedInAsOwner = auth.user !== null && !auth.isAnonymous;

  useEffect(() => {
    let alive = true;
    if (!signedInAsOwner) {
      return () => {
        alive = false;
      };
    }

    myOwnedRestaurantIds()
      .then((ids) => {
        if (alive) setOwnedList(ids);
      })
      .catch(() => {
        if (alive) setOwnedList([]);
      });

    return () => {
      alive = false;
    };
  }, [signedInAsOwner, auth.user?.id]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      Alert.alert(
        t('loginAlertTitle'),
        error instanceof Error ? error.message : t('somethingWentWrong'),
      );
    } finally {
      setBusy(false);
    }
  }

  const onSendCode = () =>
    run(async () => {
      if (!isValidEmail(email)) throw new Error(t('enterValidEmail'));
      await sendEmailCode(email);
      setCodeSent(true);
    });

  const onVerify = () =>
    run(async () => {
      if (!/^\d{6,10}$/.test(code.trim())) throw new Error(t('enterEmailCode'));
      await verifyEmailCode(email, code);
      await setAppMode('business');
      setCode('');
      setCodeSent(false);
      router.replace('/owner');
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
            {ownedList.length > 0 ? (
              <Text style={styles.sub}>{t('ownerOf', { restaurants: ownedList.join(', ') })}</Text>
            ) : (
              <Text style={styles.sub}>{t('notLinkedToRestaurant')}</Text>
            )}

            <Pressable
              style={styles.button}
              onPress={() => { void setAppMode('business').then(() => router.replace('/owner')); }}
              accessibilityRole="button">
              <Ionicons name="storefront-outline" size={19} color="#fff" />
              <Text style={styles.buttonText}>{copy('Open Owner Portal', '사장님 포털 열기')}</Text>
            </Pressable>

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
        <Pressable
          style={styles.backToUser}
          onPress={() => {
            void setAppMode('user').then(() => router.replace('/(tabs)'));
          }}
          disabled={busy}
          accessibilityRole="button">
          <Ionicons name="arrow-back" size={17} color="#1b5fad" />
          <Text style={styles.backToUserText}>{copy('Back to User Mode / Continue as guest', '일반 사용자 모드로 돌아가기 / 게스트로 계속하기')}</Text>
        </Pressable>
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
    backgroundColor: '#1b5fad',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondary: { backgroundColor: 'white', borderWidth: 1, borderColor: '#c62828' },
  secondaryText: { color: '#c62828' },
  link: { color: '#1b5fad', textAlign: 'center', marginTop: 4 },
  error: { color: '#c62828' },
  backToUser: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8, padding: 10 },
  backToUserText: { color: '#1b5fad', fontWeight: '700', textAlign: 'center' },
});
