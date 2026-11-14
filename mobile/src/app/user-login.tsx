import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
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

import { isValidEmail, sendEmailCode, verifyEmailCode } from '@/data/auth';
import { setAppMode } from '@/data/app-mode';
import { useTranslation } from '@/hooks/use-translation';

export default function UserLoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!isValidEmail(email)) {
      Alert.alert(t('checkYourEmail'), t('validEmailAddress'));
      return;
    }
    setBusy(true);
    try {
      await sendEmailCode(email);
      setCodeSent(true);
    } catch (error) {
      Alert.alert(t('couldNotSendCode'), error instanceof Error ? error.message : t('pleaseTryAgain'));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!/^\d{6,10}$/.test(code.trim())) {
      Alert.alert(t('checkYourCode'), t('enterEmailCode'));
      return;
    }
    setBusy(true);
    try {
      await verifyEmailCode(email, code);
      await setAppMode('user');
      router.replace('/(tabs)/map');
    } catch (error) {
      Alert.alert(t('couldNotSignIn'), error instanceof Error ? error.message : t('pleaseTryAgain'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: t('userAccountTitle'), headerShown: true }} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}><Ionicons name="person-outline" size={30} color="#1b5fad" /></View>
        <Text style={styles.title}>{t('userSignUpLoginTitle')}</Text>
        <Text style={styles.description}>{t('userSignUpLoginDescription')}</Text>
        {!codeSent ? (
          <>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!busy} />
            <Pressable style={styles.button} onPress={() => void sendCode()} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('sendVerificationCode')}</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.description}>{t('emailCodeSent', { email })}</Text>
            <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder={t('verificationCodePlaceholder')} keyboardType="number-pad" editable={!busy} />
            <Pressable style={styles.button} onPress={() => void verifyCode()} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('verifyAndContinue')}</Text>}
            </Pressable>
            <Pressable onPress={() => setCodeSent(false)} disabled={busy} style={styles.textButton}><Text style={styles.link}>{t('useDifferentEmail')}</Text></Pressable>
          </>
        )}
        <Pressable onPress={() => router.replace('/')} style={styles.textButton}><Text style={styles.link}>{t('backToAccountTypeSelection')}</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7fa' },
  page: { flexGrow: 1, padding: 22, justifyContent: 'center', gap: 14 },
  icon: { alignSelf: 'center', width: 62, height: 62, borderRadius: 19, backgroundColor: '#e8f0fb', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#14213d', fontSize: 23, fontWeight: '800', textAlign: 'center' },
  description: { color: '#6b7a8d', lineHeight: 21, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#cfd8e3', borderRadius: 11, padding: 14, backgroundColor: '#fff', fontSize: 16 },
  button: { minHeight: 49, borderRadius: 11, backgroundColor: '#1b5fad', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '800' },
  textButton: { alignItems: 'center', padding: 8 },
  link: { color: '#1b5fad', fontWeight: '700' },
  error: { color: '#b3261e' },
});
