import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
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

import { isValidEmail, saveOwnerApplicantProfile, sendEmailCode, verifyEmailCode } from '@/data/auth';
import { showAlert } from '@/components/show-alert';
import { useTranslation } from '@/hooks/use-translation';
import {
  normalizeOwnerPhone,
  validateOwnerRegistration,
  type OwnerApplicantType,
  type OwnerRegistrationValidationError,
} from '@/logic/owner-registration';

const BLUE = '#1B5FAD';
const NAVY = '#14213D';
const MUTED = '#64748B';

export default function OwnerRegisterScreen() {
  const router = useRouter();
  const { owner } = useTranslation();

  const [applicantType, setApplicantType] = useState<OwnerApplicantType | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [acknowledgedNotice, setAcknowledgedNotice] = useState(false);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const validationMessage = (error: OwnerRegistrationValidationError): string => {
    switch (error) {
      case 'applicantType': return owner('ownerRegistrationChooseApplicantType');
      case 'fullName': return owner('ownerRegistrationEnterFullName');
      case 'phone': return owner('ownerRegistrationEnterPhone');
      case 'invalidPhone': return owner('ownerRegistrationInvalidPhone');
      case 'email': return owner('ownerRegistrationEnterEmail');
      case 'notice': return owner('ownerRegistrationAcceptNotice');
    }
  };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      showAlert(
        owner('ownerRegistrationError'),
        error instanceof Error ? error.message : owner('ownerPleaseTryAgain'),
      );
    } finally {
      setBusy(false);
    }
  }

  function validateDetails(): boolean {
    const validationError = validateOwnerRegistration({
      applicantType,
      fullName,
      phone,
      email,
      acknowledgedNotice,
    });

    if (validationError) {
      showAlert(owner('ownerRegistrationCheckDetails'), validationMessage(validationError));
      return false;
    }

    if (!isValidEmail(email)) {
      showAlert(owner('ownerRegistrationCheckDetails'), owner('ownerRegistrationEnterEmail'));
      return false;
    }

    return true;
  }

  async function persistProfile() {
    if (!applicantType) {
      throw new Error(owner('ownerRegistrationChooseApplicantType'));
    }

    await saveOwnerApplicantProfile({
      applicantType,
      fullName: fullName.trim(),
      phone: normalizeOwnerPhone(phone),
    });
    setProfileSaved(true);
    showAlert(
      owner('ownerRegistrationComplete'),
      owner('ownerRegistrationCompleteMessage'),
      [{
        text: owner('ownerRegistrationContinue'),
        onPress: () => router.replace('/owner-login'),
      }],
    );
  }

  function handleSendCode() {
    void run(async () => {
      if (!validateDetails()) return;
      await sendEmailCode(email.trim());
      setCodeSent(true);
    });
  }

  function handleVerifyCode() {
    void run(async () => {
      if (!/^\d{6,10}$/.test(code.trim())) {
        showAlert(owner('ownerRegistrationCheckDetails'), owner('ownerRegistrationEnterCode'));
        return;
      }

      await verifyEmailCode(email.trim(), code.trim());
      setEmailVerified(true);
      // If profile saving fails after OTP succeeds, the verified state remains
      // and the user can retry saving without requesting or reusing the OTP.
      await persistProfile();
    });
  }

  function handleSaveProfile() {
    void run(persistProfile);
  }

  const canEditDetails = !codeSent && !busy;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: owner('ownerRegistrationTitle'),
          headerTintColor: NAVY,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F5F8FC' },
        }}
      />

      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.brandIcon}>
            <Ionicons name="storefront" size={27} color="#FFFFFF" />
          </View>
          <Text style={styles.brand}>MUKJI PARTNER</Text>
          <Text style={styles.title}>{owner('ownerRegistrationTitle')}</Text>
          <Text style={styles.subtitle}>{owner('ownerRegistrationIntro')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{owner('ownerRegistrationApplicantType')}</Text>
          <Pressable
            style={[styles.choice, applicantType === 'business_owner' && styles.choiceActive]}
            onPress={() => setApplicantType('business_owner')}
            disabled={!canEditDetails}
            accessibilityRole="radio"
            accessibilityState={{ checked: applicantType === 'business_owner' }}>
            <Ionicons
              name={applicantType === 'business_owner' ? 'radio-button-on' : 'radio-button-off'}
              size={21}
              color={BLUE}
            />
            <Text style={styles.choiceText}>{owner('ownerRegistrationBusinessOwner')}</Text>
          </Pressable>
          <Pressable
            style={[styles.choice, applicantType === 'authorized_representative' && styles.choiceActive]}
            onPress={() => setApplicantType('authorized_representative')}
            disabled={!canEditDetails}
            accessibilityRole="radio"
            accessibilityState={{ checked: applicantType === 'authorized_representative' }}>
            <Ionicons
              name={applicantType === 'authorized_representative' ? 'radio-button-on' : 'radio-button-off'}
              size={21}
              color={BLUE}
            />
            <Text style={styles.choiceText}>{owner('ownerRegistrationAuthorizedRepresentative')}</Text>
          </Pressable>

          <Field
            label={owner('ownerRegistrationFullName')}
            value={fullName}
            onChangeText={setFullName}
            editable={canEditDetails}
            autoCapitalize="words"
          />
          <Field
            label={owner('ownerRegistrationMobileNumber')}
            value={phone}
            onChangeText={setPhone}
            editable={canEditDetails}
            keyboardType="phone-pad"
          />
          <Field
            label={owner('ownerRegistrationEmailAddress')}
            value={email}
            onChangeText={setEmail}
            editable={canEditDetails}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.helper}>{owner('ownerRegistrationEmailNote')}</Text>

          <Pressable
            style={styles.noticeRow}
            onPress={() => setAcknowledgedNotice((current) => !current)}
            disabled={!canEditDetails}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledgedNotice }}>
            <Ionicons
              name={acknowledgedNotice ? 'checkbox' : 'square-outline'}
              size={23}
              color={acknowledgedNotice ? BLUE : MUTED}
            />
            <Text style={styles.noticeText}>{owner('ownerRegistrationPermissionNotice')}</Text>
          </Pressable>

          {!codeSent ? (
            <PrimaryButton
              title={owner('ownerRegistrationSendCode')}
              onPress={handleSendCode}
              disabled={busy}
              busy={busy}
            />
          ) : (
            <>
              <View style={styles.progressRow}>
                <View style={[styles.progressSegment, styles.progressActive]} />
                <View style={[styles.progressSegment, emailVerified && styles.progressActive]} />
              </View>

              {!emailVerified ? (
                <>
                  <Field
                    label={owner('ownerRegistrationCodeLabel')}
                    value={code}
                    onChangeText={setCode}
                    editable={!busy}
                    keyboardType="number-pad"
                  />
                  <PrimaryButton
                    title={owner('ownerRegistrationVerifyCode')}
                    onPress={handleVerifyCode}
                    disabled={busy || !code.trim()}
                    busy={busy}
                  />
                </>
              ) : (
                <View style={styles.verifiedBox}>
                  <Ionicons name="checkmark-circle" size={21} color="#16845B" />
                  <Text style={styles.verifiedText}>
                    {profileSaved ? owner('ownerRegistrationComplete') : owner('ownerRegistrationEmailVerified')}
                  </Text>
                </View>
              )}

              {emailVerified && !profileSaved && (
                <PrimaryButton
                  title={owner('ownerRegistrationSaveProfile')}
                  onPress={handleSaveProfile}
                  disabled={busy}
                  busy={busy}
                />
              )}

              {profileSaved && (
                <PrimaryButton
                  title={owner('ownerRegistrationContinue')}
                  onPress={() => router.replace('/owner-login')}
                />
              )}

              {!emailVerified && (
                <Pressable
                  onPress={() => {
                    setCodeSent(false);
                    setCode('');
                  }}
                  disabled={busy}
                  style={styles.textButton}>
                  <Text style={styles.link}>{owner('ownerRegistrationChangeDetails')}</Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark-outline" size={19} color={BLUE} />
          <Text style={styles.securityText}>{owner('ownerRegistrationPermissionNotice')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  editable,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled = false,
  busy = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button">
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.primaryButtonText}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8FC' },
  page: { flexGrow: 1, padding: 20, paddingTop: 24, gap: 18 },
  header: { alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  brandIcon: {
    width: 58, height: 58, borderRadius: 18, backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center',
  },
  brand: { color: NAVY, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { color: NAVY, fontSize: 25, lineHeight: 31, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: MUTED, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  card: {
    padding: 19, gap: 13, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E6ECF3',
  },
  sectionTitle: { color: NAVY, fontSize: 15, fontWeight: '800' },
  choice: {
    minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#D8E1EC', borderRadius: 12, paddingHorizontal: 12,
  },
  choiceActive: { borderColor: BLUE, backgroundColor: '#EFF6FF' },
  choiceText: { flex: 1, color: NAVY, fontSize: 14, fontWeight: '700' },
  field: { gap: 7 },
  label: { color: NAVY, fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 50, borderWidth: 1, borderColor: '#D8E1EC', borderRadius: 11,
    paddingHorizontal: 13, paddingVertical: 11, color: NAVY, fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: { backgroundColor: '#F3F6FA', color: MUTED },
  helper: { color: MUTED, fontSize: 12, lineHeight: 18, marginTop: -5 },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5 },
  noticeText: { flex: 1, color: '#475569', fontSize: 12, lineHeight: 19 },
  primaryButton: {
    minHeight: 51, borderRadius: 12, backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabledButton: { opacity: 0.5 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 4, backgroundColor: '#E8EDF3' },
  progressActive: { backgroundColor: BLUE },
  verifiedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12,
    borderRadius: 11, backgroundColor: '#E9F7F0',
  },
  verifiedText: { flex: 1, color: '#176B4B', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  textButton: { alignItems: 'center', padding: 7 },
  link: { color: BLUE, fontSize: 13, fontWeight: '800' },
  securityNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13,
    borderRadius: 12, backgroundColor: '#EFF6FF',
  },
  securityText: { flex: 1, color: '#31577E', fontSize: 12, lineHeight: 18 },
});
