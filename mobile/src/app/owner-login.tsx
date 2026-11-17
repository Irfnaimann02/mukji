import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  isValidEmail,
  myOwnedRestaurantIds,
  sendEmailCode,
  signInTestAccount,
  verifyEmailCode,
} from '@/data/auth';
import { setAppMode } from '@/data/app-mode';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { continueAsGuest } from '@/logic/welcome-service';
import { signOutAndReturnToWelcome } from '@/logic/session-service';
import { showAlert } from '@/components/show-alert';

const BLUE = '#1B5FAD';
const NAVY = '#14213D';
const MUTED = '#64748B';

export default function OwnerLoginScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { t, owner } = useTranslation();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ownedList, setOwnedList] = useState<string[]>([]);
  // Dev builds only: password sign-in for the shared test owner account.
  const [testPassword, setTestPassword] = useState('');

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
      showAlert(
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

  const onTestSignIn = () =>
    run(async () => {
      if (!isValidEmail(email) || testPassword === '') throw new Error(t('testAccountMissing'));
      await signInTestAccount(email, testPassword);
      await setAppMode('business');
      setTestPassword('');
      router.replace('/owner');
    });

  const onSignOut = () =>
    run(async () => {
      await signOutAndReturnToWelcome();
      router.replace('/');
    });

  const onContinueToUserMode = () =>
    run(async () => {
      if (signedInAsOwner) {
        await setAppMode('user');
      } else {
        await continueAsGuest();
      }
      router.replace('/(tabs)/map');
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('ownerLoginTitle'),
          headerTintColor: NAVY,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F5F8FC' },
        }}
      />

      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brandHeader}>
          <View style={styles.brandIcon}>
            <Ionicons name="storefront" size={29} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName}>MUKJI</Text>
          <Text style={styles.brandEyebrow}>RESTAURANT PARTNER</Text>
          <Text style={styles.heroTitle}>{t('restaurantOwnerQuestion')}</Text>
          <Text style={styles.heroDescription}>{t('ownerLoginDescription')}</Text>
        </View>

        {!auth.ready ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={BLUE} />
          </View>
        ) : signedInAsOwner ? (
          <View style={styles.card}>
            <View style={styles.statusIcon}>
              <Ionicons name="checkmark-circle" size={27} color="#16845B" />
            </View>
            <Text style={styles.cardTitle}>
              {t('signedInAs', { email: auth.email ?? '' })}
            </Text>
            {ownedList.length > 0 ? (
              <Text style={styles.description}>
                {t('ownerOf', { restaurants: ownedList.join(', ') })}
              </Text>
            ) : (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={19} color={BLUE} />
                <Text style={styles.infoText}>{t('notLinkedToRestaurant')}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              onPress={() => {
                void setAppMode('business').then(() => router.replace('/owner'));
              }}
              accessibilityRole="button">
              <Ionicons name="grid-outline" size={19} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{t('openOwnerPortal')}</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              onPress={onSignOut}
              disabled={busy}
              accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>
                {busy ? t('checking') : t('signOut')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeadingRow}>
              <View style={styles.cardHeadingIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={BLUE} />
              </View>
              <View style={styles.cardHeadingCopy}>
                <Text style={styles.cardTitle}>{t('ownerLoginTitle')}</Text>
                <Text style={styles.cardHint}>
                  {codeSent ? t('codePlaceholder') : t('ownerLoginDescription')}
                </Text>
              </View>
            </View>

            <View style={styles.progressRow}>
              <View style={[styles.progressSegment, styles.progressActive]} />
              <View style={[styles.progressSegment, codeSent && styles.progressActive]} />
            </View>

            <TextInput
              style={[styles.input, codeSent && styles.inputDisabled]}
              placeholder="owner@example.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              editable={!busy && !codeSent}
              accessibilityLabel="Email address"
            />

            {!codeSent ? (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  (busy || !email.trim()) && styles.buttonDisabled,
                  pressed && !busy && styles.pressed,
                ]}
                onPress={onSendCode}
                disabled={busy || !email.trim()}
                accessibilityRole="button">
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>{t('sendCode')}</Text>
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={t('codePlaceholder')}
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  value={code}
                  onChangeText={setCode}
                  editable={!busy}
                  accessibilityLabel="Email verification code"
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (busy || !code.trim()) && styles.buttonDisabled,
                    pressed && !busy && styles.pressed,
                  ]}
                  onPress={onVerify}
                  disabled={busy || !code.trim()}
                  accessibilityRole="button">
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>{t('signIn')}</Text>
                      <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => {
                    setCodeSent(false);
                    setCode('');
                  }}
                  disabled={busy}
                  hitSlop={8}
                  accessibilityRole="button">
                  <Text style={styles.link}>{t('useDifferentEmail')}</Text>
                </Pressable>
              </>
            )}

            {/* Dev builds only: never shown in the real app. */}
            {__DEV__ && !codeSent && (
              <View style={styles.testBox}>
                <View style={styles.testHeading}>
                  <Ionicons name="flask-outline" size={17} color="#A66500" />
                  <Text style={styles.testTitle}>{t('testAccountTitle')}</Text>
                </View>
                <Text style={styles.testHint}>{t('testAccountHint')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('passwordPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={testPassword}
                  onChangeText={setTestPassword}
                  editable={!busy}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.testButton,
                    busy && styles.buttonDisabled,
                    pressed && !busy && styles.pressed,
                  ]}
                  onPress={onTestSignIn}
                  disabled={busy}
                  accessibilityRole="button">
                  <Text style={styles.testButtonText}>{t('signInWithPassword')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {!signedInAsOwner && (
          <Pressable
            style={({ pressed }) => [pressed && styles.pressed]}
            onPress={() => router.push('/owner-register')}
            disabled={busy}
            accessibilityRole="button">
            <Text style={styles.link}>{owner('ownerCreateAccount')}</Text>
          </Pressable>
        )}

        {auth.error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#B42318" />
            <Text style={styles.error}>{auth.error}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.backToUser, pressed && styles.backToUserPressed]}
          onPress={onContinueToUserMode}
          disabled={busy}
          accessibilityRole="button">
          <Ionicons name="arrow-back" size={17} color={BLUE} />
          <Text style={styles.backToUserText}>{t('backToUserModeContinueGuest')}</Text>
        </Pressable>

        <Text style={styles.footerNote}>
          MUKJI · Restaurant information made clearer
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8FC' },
  page: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 20,
  },
  brandHeader: { alignItems: 'center', paddingHorizontal: 10, gap: 7 },
  brandIcon: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  brandName: { color: NAVY, fontSize: 21, fontWeight: '900', letterSpacing: 2.2 },
  brandEyebrow: { color: BLUE, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  heroTitle: {
    color: NAVY,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 13,
  },
  heroDescription: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 320,
  },
  loadingCard: {
    minHeight: 190,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 20,
    gap: 15,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6ECF3',
    shadowColor: '#19324D',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  cardHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardHeadingIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EAF2FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadingCopy: { flex: 1, gap: 3 },
  cardTitle: { color: NAVY, fontSize: 17, fontWeight: '800' },
  cardHint: { color: MUTED, fontSize: 12, lineHeight: 18 },
  description: { color: MUTED, fontSize: 13, lineHeight: 20 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 4, backgroundColor: '#E8EDF3' },
  progressActive: { backgroundColor: BLUE },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D8E1EC',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: NAVY,
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: { backgroundColor: '#F3F6FA', color: MUTED },
  primaryButton: {
    minHeight: 52,
    paddingHorizontal: 17,
    borderRadius: 12,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  buttonDisabled: { opacity: 0.48 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  secondaryButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D8E1EC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: { color: NAVY, fontSize: 14, fontWeight: '700' },
  link: { color: BLUE, textAlign: 'center', fontSize: 13, fontWeight: '700', padding: 5 },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#E9F7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  infoText: { flex: 1, color: '#31577E', fontSize: 13, lineHeight: 19 },
  testBox: {
    gap: 9,
    marginTop: 3,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E7ECF2',
  },
  testHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  testTitle: { color: '#8A5700', fontWeight: '800', fontSize: 13 },
  testHint: { color: MUTED, fontSize: 12, lineHeight: 18 },
  testButton: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F1D7A8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: { color: '#8A5700', fontWeight: '800', fontSize: 13 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF3F2',
  },
  error: { flex: 1, color: '#B42318', fontSize: 13, lineHeight: 19 },
  backToUser: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
  },
  backToUserPressed: { opacity: 0.7 },
  backToUserText: { color: BLUE, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  footerNote: { color: '#94A3B8', fontSize: 11, textAlign: 'center', letterSpacing: 0.3 },
});
