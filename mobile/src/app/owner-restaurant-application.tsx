import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

import { showAlert } from '@/components/show-alert';
import {
  type ClaimableRestaurant,
  type OwnerRestaurantApplication,
  type OwnerRestaurantApplicationInput,
  getClaimableRestaurant,
  loadOwnerRestaurantApplication,
  saveOwnerRestaurantApplication,
  searchClaimableRestaurants,
  submitOwnerRestaurantApplication,
} from '@/data/owner-restaurant-application-repository';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import {
  loadLatestOwnerBusinessApplication,
  listOwnerBusinessDocuments,
  OWNER_BUSINESS_PRIVACY_NOTICE_VERSION,
} from '@/logic/owner-business-service';
import {
  emptyOwnerRestaurantApplication,
  validateOwnerRestaurantApplication,
} from '@/logic/owner-restaurant-application';
import { userMessage } from '@/logic/user-error';

type StatusTranslationKey =
  | 'ownerRestaurantApplicationStatusDraft'
  | 'ownerRestaurantApplicationStatusSubmitted'
  | 'ownerRestaurantApplicationStatusUnderReview'
  | 'ownerRestaurantApplicationStatusNeedsInformation'
  | 'ownerRestaurantApplicationStatusApproved'
  | 'ownerRestaurantApplicationStatusRejected';

const STATUS_KEYS: Record<OwnerRestaurantApplication['status'], StatusTranslationKey> = {
  draft: 'ownerRestaurantApplicationStatusDraft',
  submitted: 'ownerRestaurantApplicationStatusSubmitted',
  under_review: 'ownerRestaurantApplicationStatusUnderReview',
  needs_information: 'ownerRestaurantApplicationStatusNeedsInformation',
  approved: 'ownerRestaurantApplicationStatusApproved',
  rejected: 'ownerRestaurantApplicationStatusRejected',
};

function Field({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize="sentences"
        autoCorrect={false}
        placeholderTextColor="#94A3B8"
        style={[styles.input, multiline && styles.multilineInput]}
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

export default function OwnerRestaurantApplicationScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { owner } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [businessApplicationId, setBusinessApplicationId] = useState<string | null>(null);
  const [businessStatus, setBusinessStatus] = useState<'draft' | 'submitted' | 'under_review' | 'needs_information' | 'approved' | 'rejected' | null>(null);
  const [businessSummary, setBusinessSummary] = useState<{ applicantFullName: string; registeredBusinessName: string; businessRegistrationNumber: string } | null>(null);
  const [businessDocumentNames, setBusinessDocumentNames] = useState<string[]>([]);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [application, setApplication] = useState<OwnerRestaurantApplicationInput>(
    emptyOwnerRestaurantApplication,
  );
  const [savedApplication, setSavedApplication] = useState<OwnerRestaurantApplication | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ClaimableRestaurant[]>([]);
  const [pageError, setPageError] = useState('');

  const load = useCallback(async () => {
    if (!auth.ready) return;
    if (!auth.user || auth.isAnonymous) {
      setPageError(owner('ownerSignInRequired'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setPageError('');
    try {
      const business = await loadLatestOwnerBusinessApplication();
      if (!business.application ||
          !business.application.privacyNoticeAcknowledgedAt ||
          business.application.privacyNoticeVersion !== OWNER_BUSINESS_PRIVACY_NOTICE_VERSION) {
        setBusinessApplicationId(null);
        setBusinessStatus(null);
        setBusinessSummary(null);
        setBusinessDocumentNames([]);
        setSavedApplication(null);
        setApplicationId(null);
        setApplication(emptyOwnerRestaurantApplication());
        return;
      }
      setBusinessApplicationId(business.application.id);
      setBusinessStatus(business.application.status);
      setBusinessSummary({
        applicantFullName: business.application.applicantFullName,
        registeredBusinessName: business.application.registeredBusinessName,
        businessRegistrationNumber: business.application.businessRegistrationNumber,
      });
      const documents = await listOwnerBusinessDocuments(business.application.id);
      setBusinessDocumentNames(documents.map((document) => document.originalFilename));
      const saved = await loadOwnerRestaurantApplication(business.application.id);
      setSavedApplication(saved);
      setApplicationId(saved?.id ?? null);
      setApplication(saved ? {
        kind: saved.kind,
        existingRestaurantId: saved.existingRestaurantId,
        restaurantNameKo: saved.restaurantNameKo,
        restaurantNameEn: saved.restaurantNameEn,
        category: saved.category,
        address: saved.address,
        phone: saved.phone,
        description: saved.description,
      } : emptyOwnerRestaurantApplication());
      if (saved?.kind === 'claim' && saved.existingRestaurantId) {
        const selected = await getClaimableRestaurant(saved.existingRestaurantId);
        setSearchResults(selected ? [selected] : []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      setPageError(userMessage(error, owner('ownerRestaurantApplicationLoadFailed')));
    } finally {
      setLoading(false);
    }
  }, [auth.ready, auth.user, auth.isAnonymous, owner]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [load]);

  function update<K extends keyof OwnerRestaurantApplicationInput>(
    key: K,
    value: OwnerRestaurantApplicationInput[K],
  ) {
    setApplication((current) => ({ ...current, [key]: value }));
  }

  async function handleSearch() {
    if (searchText.trim().length < 2) {
      showAlert(owner('ownerRestaurantApplicationSearch'), owner('ownerRestaurantApplicationSearchHint'));
      return;
    }
    setSearching(true);
    try {
      setSearchResults(await searchClaimableRestaurants(searchText));
    } catch (error) {
      showAlert(owner('ownerRestaurantApplicationSearch'), userMessage(error, owner('ownerPleaseTryAgain')));
    } finally {
      setSearching(false);
    }
  }

  async function handleSave() {
    if (!businessApplicationId) return;
    setSaving(true);
    try {
      const saved = await saveOwnerRestaurantApplication(
        businessApplicationId,
        application,
        applicationId,
      );
      setApplicationId(saved.id);
      setSavedApplication(saved);
      showAlert(owner('ownerDraftSaved'), owner('ownerRestaurantApplicationSaved'));
    } catch (error) {
      showAlert(
        owner('ownerRestaurantApplicationSaveFailed'),
        userMessage(error, owner('ownerPleaseTryAgain')),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReview() {
    const validationError = validateOwnerRestaurantApplication(application);
    if (validationError) {
      const messages = {
        restaurantSelection: owner('ownerRestaurantApplicationSelectRequired'),
        restaurantNameKo: owner('ownerRestaurantApplicationNameKoRequired'),
        restaurantNameEn: owner('ownerRestaurantApplicationNameEnRequired'),
        category: owner('ownerRestaurantApplicationCategoryRequired'),
        address: owner('ownerRestaurantApplicationAddressRequired'),
        phone: owner('ownerRestaurantApplicationPhoneInvalid'),
        description: owner('ownerRestaurantApplicationDescriptionTooLong'),
      };
      showAlert(owner('ownerRestaurantApplicationValidation'), messages[validationError]);
      return;
    }
    if (!businessApplicationId) return;

    // Persist the exact values shown on the review screen before submission.
    setSaving(true);
    try {
      const saved = await saveOwnerRestaurantApplication(
        businessApplicationId,
        application,
        applicationId,
      );
      setApplicationId(saved.id);
      setSavedApplication(saved);
      setReviewing(true);
    } catch (error) {
      showAlert(
        owner('ownerRestaurantApplicationSaveFailed'),
        userMessage(error, owner('ownerPleaseTryAgain')),
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit() {
    if (!businessApplicationId || !applicationId) return;
    showAlert(owner('ownerRestaurantApplicationSubmit'), owner('ownerRestaurantApplicationConfirm'), [
      { text: owner('ownerKeep'), style: 'cancel' },
      {
        text: owner('ownerRestaurantApplicationSubmit'),
        onPress: () => {
          void (async () => {
            setSubmitting(true);
            try {
              await submitOwnerRestaurantApplication(applicationId);
              setReviewing(false);
              await load();
              showAlert(
                owner('ownerRestaurantApplicationSubmitted'),
                owner('ownerRestaurantApplicationSubmittedMessage'),
              );
            } catch (error) {
              showAlert(
                owner('ownerRestaurantApplicationSubmitFailed'),
                userMessage(error, owner('ownerPleaseTryAgain')),
              );
            } finally {
              setSubmitting(false);
            }
          })();
        },
      },
    ]);
  }

  const isLocked = businessStatus !== 'draft' || Boolean(savedApplication && savedApplication.status !== 'draft');

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: owner('ownerRestaurantApplicationTitle'), headerShown: true }} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#F26A21" />
          </View>
        ) : pageError ? (
          <View style={styles.card}>
            <Text style={styles.title}>{owner('ownerRestaurantApplicationTitle')}</Text>
            <Text style={styles.body}>{pageError}</Text>
            <ActionButton title={owner('ownerTryAgain')} onPress={() => void load()} />
            <ActionButton title={owner('ownerBackToOwnerPortal')} secondary onPress={() => router.back()} />
          </View>
        ) : !businessApplicationId ? (
          <View style={styles.card}>
            <Ionicons name="document-text-outline" size={36} color="#F26A21" />
            <Text style={styles.title}>{owner('ownerRestaurantApplicationBusinessRequired')}</Text>
            <Text style={styles.body}>{owner('ownerBusinessSaveFirstMessage')}</Text>
            <ActionButton title={owner('ownerBusinessOnboarding')} onPress={() => router.replace('/owner-business')} />
            <ActionButton title={owner('ownerBackToOwnerPortal')} secondary onPress={() => router.back()} />
          </View>
        ) : (
          <>
            <Text style={styles.title}>{owner('ownerRestaurantApplicationTitle')}</Text>
            <Text style={styles.body}>{owner('ownerRestaurantApplicationIntro')}</Text>

            {savedApplication && (
              <View style={styles.statusCard}>
                <Text style={styles.label}>{owner('ownerRestaurantApplicationStatus')}</Text>
                <Text style={styles.statusValue}>{owner(STATUS_KEYS[savedApplication.status])}</Text>
                {savedApplication.reviewMessage ? (
                  <Text style={styles.body}>{owner('ownerRestaurantApplicationReviewMessage')}: {savedApplication.reviewMessage}</Text>
                ) : null}
                {isLocked ? <Text style={styles.body}>{owner('ownerRestaurantApplicationLocked')}</Text> : null}
              </View>
            )}

            {!isLocked && !reviewing && (
              <>
                <View style={styles.choiceRow}>
                  {(['new', 'claim'] as const).map((kind) => (
                    <Pressable
                      key={kind}
                      onPress={() => update('kind', kind)}
                      style={[styles.choice, application.kind === kind && styles.choiceActive]}>
                      <Text style={[styles.choiceText, application.kind === kind && styles.choiceTextActive]}>
                        {owner(kind === 'new' ? 'ownerRestaurantApplicationNew' : 'ownerRestaurantApplicationClaim')}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {application.kind === 'claim' ? (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{owner('ownerRestaurantApplicationSearch')}</Text>
                    <Text style={styles.body}>{owner('ownerRestaurantApplicationSearchHint')}</Text>
                    <TextInput
                      value={searchText}
                      onChangeText={setSearchText}
                      placeholder={owner('ownerRestaurantApplicationSearch')}
                      placeholderTextColor="#94A3B8"
                      style={styles.input}
                    />
                    <ActionButton
                      title={searching ? owner('ownerSaving') : owner('ownerRestaurantApplicationSearch')}
                      onPress={() => void handleSearch()}
                      disabled={searching}
                    />
                    {searchResults.length === 0 ? (
                      <Text style={styles.body}>{owner('ownerRestaurantApplicationNoResults')}</Text>
                    ) : searchResults.map((restaurant) => {
                      const selected = application.existingRestaurantId === restaurant.id;
                      return (
                        <Pressable
                          key={restaurant.id}
                          onPress={() => update('existingRestaurantId', restaurant.id)}
                          style={[styles.result, selected && styles.resultSelected]}>
                          <View style={styles.resultText}>
                            <Text style={styles.resultName}>{restaurant.nameKo} · {restaurant.nameEn}</Text>
                            <Text style={styles.body}>{restaurant.address}</Text>
                            {restaurant.phone ? <Text style={styles.muted}>{restaurant.phone}</Text> : null}
                          </View>
                          <Ionicons
                            name={selected ? 'radio-button-on' : 'radio-button-off'}
                            size={22}
                            color="#F26A21"
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{owner('ownerRestaurantApplicationNewDetails')}</Text>
                    <Field label={owner('ownerRestaurantApplicationNameKo')} value={application.restaurantNameKo} onChangeText={(value) => update('restaurantNameKo', value)} />
                    <Field label={owner('ownerRestaurantApplicationNameEn')} value={application.restaurantNameEn} onChangeText={(value) => update('restaurantNameEn', value)} />
                    <Field label={owner('ownerRestaurantApplicationCategory')} value={application.category} onChangeText={(value) => update('category', value)} />
                    <Field label={owner('ownerRestaurantApplicationAddress')} value={application.address} onChangeText={(value) => update('address', value)} multiline />
                    <Field label={owner('ownerRestaurantApplicationPhone')} value={application.phone} onChangeText={(value) => update('phone', value)} keyboardType="phone-pad" />
                    <Field label={owner('ownerRestaurantApplicationDescription')} value={application.description} onChangeText={(value) => update('description', value)} multiline />
                  </View>
                )}

                <View style={styles.noticeCard}>
                  <Ionicons name="information-circle-outline" size={22} color="#F26A21" />
                  <Text style={styles.body}>{owner('ownerRestaurantApplicationPrivacy')}</Text>
                </View>
                <ActionButton
                  title={saving ? owner('ownerSaving') : owner('ownerRestaurantApplicationSave')}
                  onPress={() => void handleSave()}
                  disabled={saving || submitting}
                  secondary
                />
                <ActionButton
                  title={owner('ownerRestaurantApplicationReview')}
                  onPress={() => void handleReview()}
                  disabled={saving || submitting}
                />
              </>
            )}
            {!isLocked && reviewing ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{owner('ownerRestaurantApplicationReview')}</Text>
                <Text style={styles.label}>{owner('ownerBusinessInformationSection')}</Text>
                <Text style={styles.resultName}>{businessSummary?.registeredBusinessName ?? ''}</Text>
                <Text style={styles.body}>{owner('ownerBusinessRegistrationNumber')}: {businessSummary?.businessRegistrationNumber ?? ''}</Text>
                <Text style={styles.body}>{owner('ownerBusinessApplicantName')}: {businessSummary?.applicantFullName ?? ''}</Text>
                <Text style={styles.label}>{owner('ownerBusinessDocumentCentre')}</Text>
                {businessDocumentNames.length > 0
                  ? businessDocumentNames.map((name) => <Text key={name} style={styles.body}>• {name}</Text>)
                  : <Text style={styles.body}>{owner('ownerNoDocumentsUploaded')}</Text>}
                <Text style={styles.label}>{owner(application.kind === 'new' ? 'ownerRestaurantApplicationNew' : 'ownerRestaurantApplicationClaim')}</Text>
                {application.kind === 'claim' ? (
                  <>
                    <Text style={styles.resultName}>{owner('ownerRestaurantApplicationSelected')}</Text>
                    <Text style={styles.body}>
                      {searchResults.find((item) => item.id === application.existingRestaurantId)?.nameKo ?? application.existingRestaurantId}
                    </Text>
                    <Text style={styles.body}>
                      {searchResults.find((item) => item.id === application.existingRestaurantId)?.address ?? ''}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.resultName}>{application.restaurantNameKo} · {application.restaurantNameEn}</Text>
                    <Text style={styles.body}>{application.category}</Text>
                    <Text style={styles.body}>{application.address}</Text>
                    <Text style={styles.body}>{application.phone}</Text>
                    {application.description ? <Text style={styles.body}>{application.description}</Text> : null}
                  </>
                )}
                <Text style={styles.body}>{owner('ownerRestaurantApplicationPrivacy')}</Text>
                <ActionButton title={owner('ownerRestaurantApplicationEdit')} secondary onPress={() => setReviewing(false)} />
                <ActionButton
                  title={submitting ? owner('ownerSaving') : owner('ownerRestaurantApplicationSubmit')}
                  onPress={handleSubmit}
                  disabled={submitting}
                />
              </View>
            ) : null}
            <ActionButton title={owner('ownerBackToOwnerPortal')} secondary onPress={() => router.back()} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FA' },
  page: { padding: 20, gap: 14, paddingBottom: 36 },
  loading: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#171717', fontSize: 24, fontWeight: '800' },
  body: { color: '#4B4B4B', fontSize: 14, lineHeight: 21 },
  muted: { color: '#718096', fontSize: 12, marginTop: 3 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E4EAF1' },
  statusCard: { backgroundColor: '#FFF6F0', borderRadius: 14, padding: 16, gap: 6, borderWidth: 1, borderColor: '#F5C5A8' },
  label: { color: '#4B4B4B', fontSize: 13, fontWeight: '700' },
  statusValue: { color: '#4B4B4B', fontSize: 18, fontWeight: '800' },
  sectionTitle: { color: '#171717', fontSize: 17, fontWeight: '800' },
  field: { gap: 6 },
  input: { borderWidth: 1, borderColor: '#D8E0EA', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: '#171717', fontSize: 15 },
  multilineInput: { minHeight: 86, textAlignVertical: 'top' },
  choiceRow: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, minHeight: 56, justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: '#D8E0EA', borderRadius: 12, backgroundColor: '#FFFFFF' },
  choiceActive: { borderColor: '#F26A21', backgroundColor: '#FFF6F0' },
  choiceText: { color: '#4B4B4B', fontWeight: '700', textAlign: 'center' },
  choiceTextActive: { color: '#4B4B4B' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#E1E7EF', borderRadius: 12 },
  resultSelected: { borderColor: '#F26A21', backgroundColor: '#FFF6F0' },
  resultText: { flex: 1 },
  resultName: { color: '#171717', fontWeight: '700', fontSize: 14 },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, backgroundColor: '#FFF6F0', borderRadius: 12 },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: '#F26A21', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F5C5A8' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButtonText: { color: '#F26A21' },
  disabled: { opacity: 0.55 },
});
