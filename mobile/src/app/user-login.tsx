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

export default function UserLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!isValidEmail(email)) {
      Alert.alert('Check your email', 'Please enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await sendEmailCode(email);
      setCodeSent(true);
    } catch (error) {
      Alert.alert('Could not send code', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!/^\d{6,10}$/.test(code.trim())) {
      Alert.alert('Check your code', 'Enter the code sent to your email.');
      return;
    }
    setBusy(true);
    try {
      await verifyEmailCode(email, code);
      await setAppMode('user');
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Could not sign in', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'User account', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}><Ionicons name="person-outline" size={30} color="#1b5fad" /></View>
        <Text style={styles.title}>User sign up or log in</Text>
        <Text style={styles.description}>Enter your email. We will send you a one-time code. If you are new to MUKJI, your account will be created after verification.</Text>
        {!codeSent ? (
          <>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!busy} />
            <Pressable style={styles.button} onPress={() => void sendCode()} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send verification code</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.description}>Enter the code sent to {email}.</Text>
            <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="Verification code" keyboardType="number-pad" editable={!busy} />
            <Pressable style={styles.button} onPress={() => void verifyCode()} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify and continue</Text>}
            </Pressable>
            <Pressable onPress={() => setCodeSent(false)} disabled={busy} style={styles.textButton}><Text style={styles.link}>Use a different email</Text></Pressable>
          </>
        )}
        <Pressable onPress={() => router.replace('/')} style={styles.textButton}><Text style={styles.link}>Back to account type selection</Text></Pressable>
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
