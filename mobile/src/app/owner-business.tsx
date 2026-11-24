import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/components/show-alert';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import {
  createOwnerBusinessDocumentUrl,
  deleteOwnerBusinessDraft,
  emptyOwnerBusinessDetails,
  listOwnerBusinessDocuments,
  loadLatestOwnerBusinessApplication,
  removeOwnerBusinessDocument,
  saveOwnerBusinessDraft,
  uploadOwnerBusinessDocument,
  OWNER_BUSINESS_PRIVACY_NOTICE_VERSION,
  type OwnerBusinessDocument,
  type OwnerBusinessDraft,
} from '@/logic/owner-business-service';
import {
  OWNER_DOCUMENT_MIME_TYPES,
  validateOwnerBusinessDetails,
  validateOwnerDocument,
  type OwnerBusinessDetails,
  type OwnerDocumentType,
} from '@/logic/owner-business-onboarding';
import { userMessage } from '@/logic/user-error';

const DOCUMENT_TYPES: {
  value: OwnerDocumentType;
  label:
    | 'ownerBusinessRegistrationCertificate'
    | 'ownerRestaurantBusinessNotification'
    | 'ownerAuthorizationLetter'
    | 'ownerOtherSupportingDocument';
}[] = [
  { value: 'business_registration_certificate', label: 'ownerBusinessRegistrationCertificate' },
  { value: 'restaurant_business_notification', label: 'ownerRestaurantBusinessNotification' },
  { value: 'authorization_letter', label: 'ownerAuthorizationLetter' },
  { value: 'other', label: 'ownerOtherSupportingDocument' },
];

function Field({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={false}
        style={styles.input}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[styles.button, secondary && styles.secondaryButton, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{title}</Text>
    </Pressable>
  );
}

export default function OwnerBusinessOnboardingScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { owner } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [privacyNoticeAccepted, setPrivacyNoticeAccepted] = useState(false);
  const [privacyNoticePersisted, setPrivacyNoticePersisted] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<OwnerBusinessDraft['status'] | null>(null);
  const [details, setDetails] = useState<OwnerBusinessDetails>(() =>
    auth.user
      ? emptyOwnerBusinessDetails(auth.user)
      : {
          applicantType: null,
          applicantFullName: '',
          applicantPhone: '',
          applicantEmail: '',
          businessType: 'individual',
          businessRegistrationNumber: '',
          registeredBusinessName: '',
          legalRepresentativeName: '',
          businessContactPhone: '',
          registeredAddress: '',
        },
  );
  const [documents, setDocuments] = useState<OwnerBusinessDocument[]>([]);
  const [pageError, setPageError] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] =
    useState<OwnerDocumentType>('business_registration_certificate');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!auth.ready) return;
      if (!auth.user || auth.isAnonymous) {
        setPageError(owner('ownerSignInRequired'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setPageError('');
      try {
        const result = await loadLatestOwnerBusinessApplication();
        if (!active) return;
        setDetails(result.initialDetails);
        setDraftId(result.application?.id ?? null);
        setDraftStatus(result.application?.status ?? null);
        const noticeIsCurrent = result.application?.privacyNoticeVersion === OWNER_BUSINESS_PRIVACY_NOTICE_VERSION;
        setPrivacyNoticeAccepted(Boolean(result.application?.privacyNoticeAcknowledgedAt && noticeIsCurrent));
        setPrivacyNoticePersisted(Boolean(result.application?.privacyNoticeAcknowledgedAt && noticeIsCurrent));
        if (result.application) {
          const savedDocuments = await listOwnerBusinessDocuments(result.application.id);
          if (!active) return;
          setDocuments(savedDocuments);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        if (!active) return;
        setPageError(userMessage(error, owner('ownerBusinessDraftLoadFailed')));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [auth.ready, auth.user, auth.isAnonymous, owner]);

  function update<K extends keyof OwnerBusinessDetails>(key: K, value: OwnerBusinessDetails[K]) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!privacyNoticeAccepted) {
      showAlert(owner('ownerBusinessPrivacyConsentRequired'), owner('ownerBusinessPrivacyNotice'));
      return;
    }

    const validationError = validateOwnerBusinessDetails(details);
    if (validationError) {
      const messages: Record<typeof validationError, string> = {
        applicantType: owner('ownerBusinessApplicantTypeRequired'),
        applicantFullName: owner('ownerBusinessApplicantNameRequired'),
        applicantPhone: owner('ownerBusinessApplicantPhoneInvalid'),
        applicantEmail: owner('ownerBusinessApplicantEmailInvalid'),
        businessRegistrationNumber: owner('ownerBusinessNumberInvalid'),
        registeredBusinessName: owner('ownerBusinessNameRequired'),
        legalRepresentativeName: owner('ownerBusinessRepresentativeRequired'),
        businessContactPhone: owner('ownerBusinessPhoneInvalid'),
        registeredAddress: owner('ownerBusinessAddressRequired'),
      };
      showAlert(owner('ownerCheckTheApplication'), messages[validationError]);
      return;
    }

    setSaving(true);
    try {
      const saved = await saveOwnerBusinessDraft(details, draftId);
      setDraftId(saved.id);
      setDraftStatus(saved.status);
      setPrivacyNoticePersisted(true);
      setDetails({
        applicantType: saved.applicantType,
        applicantFullName: saved.applicantFullName,
        applicantPhone: saved.applicantPhone,
        applicantEmail: saved.applicantEmail,
        businessType: saved.businessType,
        businessRegistrationNumber: saved.businessRegistrationNumber,
        registeredBusinessName: saved.registeredBusinessName,
        legalRepresentativeName: saved.legalRepresentativeName,
        businessContactPhone: saved.businessContactPhone,
        registeredAddress: saved.registeredAddress,
      });
      showAlert(owner('ownerBusinessDraftSaved'), owner('ownerBusinessDraftSavedMessage'));
    } catch (error) {
      showAlert(owner('ownerBusinessSaveFailed'), userMessage(error, owner('ownerPleaseTryAgain')));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload() {
    if (!privacyNoticeAccepted || !privacyNoticePersisted) {
      showAlert(owner('ownerBusinessPrivacyConsentRequired'), owner('ownerBusinessPrivacyNotice'));
      return;
    }
    if (!draftId || draftStatus !== 'draft') {
      showAlert(owner('ownerBusinessSaveFirst'), owner('ownerBusinessSaveFirstMessage'));
      return;
    }

    setUploading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...OWNER_DOCUMENT_MIME_TYPES],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const validationError = validateOwnerDocument(asset.mimeType, asset.name, asset.size);
      if (validationError) {
        showAlert(
          owner('ownerDocumentUploadFailed'),
          validationError === 'unsupportedType'
            ? owner('ownerDocumentUnsupportedType')
            : owner('ownerDocumentTooLarge'),
        );
        return;
      }

      const uploaded = await uploadOwnerBusinessDocument({
        applicationId: draftId,
        documentType: selectedDocumentType,
        uri: asset.uri,
        filename: asset.name,
        mimeType: asset.mimeType,
        fileSize: asset.size,
      });
      setDocuments((current) => [...current, uploaded]);
      showAlert(owner('ownerDocumentUploadSuccess'), uploaded.originalFilename);
    } catch (error) {
      showAlert(owner('ownerDocumentUploadFailed'), userMessage(error, owner('ownerPleaseTryAgain')));
    } finally {
      setUploading(false);
    }
  }

  async function handleOpenDocument(document: OwnerBusinessDocument) {
    try {
      const url = await createOwnerBusinessDocumentUrl(document.storagePath);
      await Linking.openURL(url);
    } catch (error) {
      showAlert(owner('ownerDocumentOpenFailed'), userMessage(error, owner('ownerPleaseTryAgain')));
    }
  }

  function handleRemoveDocument(document: OwnerBusinessDocument) {
    showAlert(owner('ownerRemoveDocument'), owner('ownerRemoveDocumentConfirm'), [
      { text: owner('ownerKeep'), style: 'cancel' },
      {
        text: owner('ownerRemoveDocument'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await removeOwnerBusinessDocument(document);
              setDocuments((current) => current.filter((item) => item.id !== document.id));
            } catch (error) {
              showAlert(owner('ownerDocumentRemoveFailed'), userMessage(error, owner('ownerPleaseTryAgain')));
            }
          })();
        },
      },
    ]);
  }

  function handleDeleteDraft() {
    if (!draftId || draftStatus !== 'draft' || saving || uploading || deleting) return;

    showAlert(owner('ownerDeleteBusinessDraft'), owner('ownerDeleteBusinessDraftConfirm'), [
      { text: owner('ownerKeep'), style: 'cancel' },
      {
        text: owner('ownerDeleteBusinessDraft'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeleting(true);
            try {
              await deleteOwnerBusinessDraft(draftId);
              setDraftId(null);
              setDraftStatus(null);
              setDocuments([]);
              setPrivacyNoticeAccepted(false);
              setPrivacyNoticePersisted(false);
              if (auth.user) setDetails(emptyOwnerBusinessDetails(auth.user));
              showAlert(owner('ownerBusinessDraftDeleted'), owner('ownerBusinessDraftDeletedMessage'));
            } catch (error) {
              showAlert(owner('ownerBusinessDraftDeleteFailed'), userMessage(error, owner('ownerPleaseTryAgain')));
            } finally {
              setDeleting(false);
            }
          })();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: owner('ownerBusinessOnboardingTitle'),
          headerShown: true,
          headerTintColor: '#14213D',
          headerStyle: { backgroundColor: '#F5F8FC' },
        }}
      />

      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.icon}>
            <Ionicons name="business-outline" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>{owner('ownerBusinessOnboardingTitle')}</Text>
          <Text style={styles.subtitle}>{owner('ownerBusinessOnboardingIntro')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1B5FAD" style={styles.loading} />
        ) : pageError ? (
          <View style={styles.warning}>
            <Text style={styles.warningText}>{pageError}</Text>
            <ActionButton title={owner('ownerBackToOwnerPortal')} secondary onPress={() => router.back()} />
          </View>
        ) : draftId && draftStatus !== 'draft' ? (
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>{owner('ownerRestaurantApplicationStatus')}</Text>
            <Text style={styles.warningText}>{owner('ownerBusinessSubmittedLocked')}</Text>
            <ActionButton title={owner('ownerBackToOwnerPortal')} secondary onPress={() => router.back()} />
          </View>
        ) : (
          <>
            <View style={styles.notice}>
              <Ionicons name="lock-closed-outline" size={20} color="#1B5FAD" />
              <Text style={styles.noticeText}>{owner('ownerBusinessPrivacyNotice')}</Text>
            </View>
            <Pressable
              onPress={() => {
                setPrivacyNoticeAccepted((current) => !current);
                setPrivacyNoticePersisted(false);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: privacyNoticeAccepted }}
              style={styles.consentRow}>
              <Ionicons
                name={privacyNoticeAccepted ? 'checkbox' : 'square-outline'}
                size={22}
                color="#1B5FAD"
              />
              <Text style={styles.consentText}>{owner('ownerBusinessPrivacyConsent')}</Text>
            </Pressable>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{owner('ownerBusinessApplicantSection')}</Text>
              <Text style={styles.label}>{owner('ownerBusinessApplicantRelationship')}</Text>
              {([
                ['business_owner', 'ownerBusinessOwnerRole'],
                ['authorized_representative', 'ownerAuthorizedRepresentativeRole'],
              ] as const).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => update('applicantType', value)}
                  style={[styles.choice, details.applicantType === value && styles.choiceActive]}>
                  <Ionicons
                    name={details.applicantType === value ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color="#1B5FAD"
                  />
                  <Text style={styles.choiceText}>{owner(label)}</Text>
                </Pressable>
              ))}
              <Field
                label={owner('ownerBusinessApplicantName')}
                value={details.applicantFullName}
                onChangeText={(value) => update('applicantFullName', value)}
              />
              <Field
                label={owner('ownerBusinessApplicantPhone')}
                value={details.applicantPhone}
                onChangeText={(value) => update('applicantPhone', value)}
                keyboardType="phone-pad"
              />
              <Field
                label={owner('ownerBusinessApplicantEmail')}
                value={details.applicantEmail}
                onChangeText={(value) => update('applicantEmail', value)}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{owner('ownerBusinessInformationSection')}</Text>
              <Text style={styles.label}>{owner('ownerBusinessType')}</Text>
              {([
                ['individual', 'ownerIndividualBusiness'],
                ['corporation', 'ownerCorporateBusiness'],
              ] as const).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => update('businessType', value)}
                  style={[styles.choice, details.businessType === value && styles.choiceActive]}>
                  <Ionicons
                    name={details.businessType === value ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color="#1B5FAD"
                  />
                  <Text style={styles.choiceText}>{owner(label)}</Text>
                </Pressable>
              ))}
              <Field
                label={owner('ownerBusinessRegistrationNumber')}
                value={details.businessRegistrationNumber}
                onChangeText={(value) => update('businessRegistrationNumber', value)}
                keyboardType="numeric"
              />
              <Field
                label={owner('ownerRegisteredBusinessName')}
                value={details.registeredBusinessName}
                onChangeText={(value) => update('registeredBusinessName', value)}
              />
              <Field
                label={owner('ownerLegalRepresentativeName')}
                value={details.legalRepresentativeName}
                onChangeText={(value) => update('legalRepresentativeName', value)}
              />
              <Field
                label={owner('ownerBusinessContactPhone')}
                value={details.businessContactPhone}
                onChangeText={(value) => update('businessContactPhone', value)}
                keyboardType="phone-pad"
              />
              <Field
                label={owner('ownerRegisteredBusinessAddress')}
                value={details.registeredAddress}
                onChangeText={(value) => update('registeredAddress', value)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{owner('ownerBusinessDocumentCentre')}</Text>
              <Text style={styles.bodyText}>{owner('ownerBusinessDocumentHint')}</Text>
              <Text style={styles.label}>{owner('ownerBusinessDocumentType')}</Text>
              {DOCUMENT_TYPES.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setSelectedDocumentType(item.value)}
                  style={[styles.choice, selectedDocumentType === item.value && styles.choiceActive]}>
                  <Ionicons
                    name={selectedDocumentType === item.value ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color="#1B5FAD"
                  />
                  <Text style={styles.choiceText}>{owner(item.label)}</Text>
                </Pressable>
              ))}
              <ActionButton
                title={uploading ? owner('ownerUploadingDocument') : owner('ownerChooseAndUploadDocument')}
                onPress={() => void handleUpload()}
                disabled={uploading || saving}
              />
              <Text style={styles.muted}>{owner('ownerDocumentAcceptedTypes')}</Text>
              {documents.length === 0 ? (
                <Text style={styles.muted}>{owner('ownerNoDocumentsUploaded')}</Text>
              ) : (
                documents.map((document) => (
                  <View key={document.id} style={styles.documentRow}>
                    <Ionicons name="document-text-outline" size={21} color="#1B5FAD" />
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentName}>{document.originalFilename}</Text>
                      <Text style={styles.muted}>
                        {owner(DOCUMENT_TYPES.find((item) => item.value === document.documentType)?.label ?? 'ownerOtherSupportingDocument')}
                        {' · '}
                        {(document.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </View>
                    <Pressable onPress={() => void handleOpenDocument(document)} accessibilityRole="button">
                      <Ionicons name="open-outline" size={20} color="#1B5FAD" />
                    </Pressable>
                    <Pressable onPress={() => handleRemoveDocument(document)} accessibilityRole="button">
                      <Ionicons name="trash-outline" size={20} color="#B3261E" />
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            <View style={styles.warning}>
              <Text style={styles.warningTitle}>{owner('ownerDraftOnlyNotSubmitted')}</Text>
              <Text style={styles.warningText}>{owner('ownerBusinessDraftPrivateNotice')}</Text>
            </View>

            <ActionButton
              title={saving ? owner('ownerSaving') : owner('ownerSaveBusinessDraft')}
              onPress={() => void handleSave()}
              disabled={saving || uploading}
            />
            {draftId && draftStatus === 'draft' && privacyNoticePersisted ? (
              <ActionButton
                title={owner('ownerRestaurantApplicationTitle')}
                onPress={() => router.push('/owner-restaurant-application')}
                disabled={saving || uploading || deleting}
              />
            ) : null}
            {draftId && draftStatus === 'draft' ? (
              <ActionButton
                title={deleting ? owner('ownerDeletingBusinessDraft') : owner('ownerDeleteBusinessDraft')}
                onPress={handleDeleteDraft}
                disabled={saving || uploading || deleting}
                secondary
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8FC' },
  page: { padding: 18, paddingBottom: 36, gap: 16 },
  header: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  icon: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#1B5FAD', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#14213D', fontSize: 23, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#64748B', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  loading: { padding: 30 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, backgroundColor: '#EAF2FC' },
  noticeText: { flex: 1, color: '#31577E', fontSize: 12, lineHeight: 19 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 4, paddingVertical: 6 },
  consentText: { flex: 1, color: '#344256', fontSize: 12, lineHeight: 19 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E5EAF0' },
  sectionTitle: { color: '#14213D', fontSize: 16, fontWeight: '800' },
  label: { color: '#344256', fontSize: 13, fontWeight: '700' },
  field: { gap: 6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#D5DDE7', borderRadius: 10, paddingHorizontal: 12, color: '#14213D', backgroundColor: '#FFFFFF' },
  choice: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#D5DDE7', borderRadius: 10, paddingHorizontal: 12 },
  choiceActive: { borderColor: '#1B5FAD', backgroundColor: '#EEF5FD' },
  choiceText: { flex: 1, color: '#344256', fontSize: 13, fontWeight: '600' },
  bodyText: { color: '#64748B', fontSize: 12, lineHeight: 19 },
  button: { minHeight: 49, borderRadius: 11, backgroundColor: '#1B5FAD', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#1B5FAD' },
  secondaryButtonText: { color: '#1B5FAD' },
  disabled: { opacity: 0.5 },
  muted: { color: '#64748B', fontSize: 11, lineHeight: 17 },
  documentRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EEF2F6' },
  documentInfo: { flex: 1, gap: 3 },
  documentName: { color: '#14213D', fontSize: 12, fontWeight: '700' },
  warning: { padding: 14, borderRadius: 12, backgroundColor: '#FFF4DF', gap: 7 },
  warningTitle: { color: '#8A5A00', fontWeight: '800', fontSize: 13 },
  warningText: { color: '#72531E', fontSize: 12, lineHeight: 19 },
});
