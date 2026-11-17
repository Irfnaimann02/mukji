import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { OwnerReservations } from '@/components/owner-reservations';
import { ALL_INGREDIENTS, type Restaurant } from '@/data/types';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import type { OwnerPortalTranslationKey } from '@/i18n/translations';
import { continueAsGuest } from '@/logic/welcome-service';
import { signOutAndReturnToWelcome } from '@/logic/session-service';
import {
  createRestaurantDraft,
  isValidOwnerEmail,
  loadOwnerDrafts,
  loadOwnerPortalRestaurants,
  saveApplicationDraft as persistApplicationDraft,
  saveRestaurantDrafts,
  switchToUserMode,
  EMPTY_APPLICATION_DRAFT,
  type ApplicationDraft,
  type DishDraft,
  type RestaurantDraft,
} from '@/logic/owner-portal-service';
import { showAlert } from '@/components/show-alert';


// Same list as the app's Ingredient type (src/data/types.ts).
const ALLOWED_INGREDIENTS: readonly string[] = ALL_INGREDIENTS;

type PortalTab = 'overview' | 'restaurant' | 'menu' | 'reservations' | 'settings';
function parseIngredientText(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9aa5b1"
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryButton, disabled && styles.disabledButton]}
      accessibilityRole="button">
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export default function OwnerPortalScreen() {
  const auth = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const previewMode = __DEV__ && params.preview === '1';
  const { owner } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [draftError, setDraftError] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [ownedRestaurants, setOwnedRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [application, setApplication] = useState<ApplicationDraft>(EMPTY_APPLICATION_DRAFT);
  const [restaurantDrafts, setRestaurantDrafts] = useState<Record<string, RestaurantDraft>>({});

  const signedInAsOwner = auth.user !== null && !auth.isAnonymous;
  const userId = auth.user?.id ?? '';
  // Preview drafts are stored separately from every real account.
  const draftOwnerKey = previewMode ? 'preview' : userId;

  const selectedRestaurant = useMemo(
    () =>
      ownedRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
      ownedRestaurants[0],
    [ownedRestaurants, selectedRestaurantId],
  );

  const activeDraft = selectedRestaurant
    ? restaurantDrafts[selectedRestaurant.id] ?? createRestaurantDraft(selectedRestaurant)
    : undefined;

  // Drafts are private to the signed-in account on this device.
  useEffect(() => {
    let alive = true;

    async function loadDrafts() {
      if (!auth.ready || !draftOwnerKey || (!previewMode && auth.isAnonymous)) {
        setDraftsLoading(false);
        return;
      }

      setDraftsLoading(true);
      setDraftError('');

      try {
        const savedDrafts = await loadOwnerDrafts(draftOwnerKey);
        if (!alive) return;
        setApplication(savedDrafts.application);
        setRestaurantDrafts(savedDrafts.restaurantDrafts);
      } catch (error) {
        if (!alive) return;
        setDraftError(
          error instanceof Error
            ? error.message
            : owner('ownerSavedDraftsCouldNotBeRead'),
        );
      } finally {
        if (alive) setDraftsLoading(false);
      }
    }

    void loadDrafts();

    return () => {
      alive = false;
    };
  }, [auth.ready, auth.isAnonymous, draftOwnerKey, previewMode, owner]);

  // Restaurant ownership is assigned by the Mukji team in Supabase.
  useEffect(() => {
    let alive = true;

    async function loadOwnerData() {
      if (!auth.ready) return;

      if (!signedInAsOwner && !previewMode) {
        setOwnedRestaurants([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setPortalError('');

      try {
        const { restaurants: allRestaurants, ownedRestaurants: linked } =
          await loadOwnerPortalRestaurants(previewMode);
        if (!alive) return;
        setRestaurants(allRestaurants);
        setOwnedRestaurants(linked);
        setSelectedRestaurantId((current) =>
          linked.some((restaurant) => restaurant.id === current)
            ? current
            : linked[0]?.id ?? '',
        );
      } catch (error) {
        if (!alive) return;
        setPortalError(
          error instanceof Error
            ? error.message
            : owner('ownerCouldNotLoadYourOwnerInformation'),
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadOwnerData();

    return () => {
      alive = false;
    };
  }, [auth.ready, auth.user?.id, signedInAsOwner, previewMode, owner]);

  function updateApplication<K extends keyof ApplicationDraft>(
    key: K,
    value: ApplicationDraft[K],
  ) {
    setApplication((current) => ({ ...current, [key]: value }));
  }

  function validateApplication(): string | null {
    const email = application.email.trim() || auth.email || '';

    if (!application.ownerName.trim()) {
      return owner('ownerEnterTheOwnerName');
    }
    if (!isValidOwnerEmail(email)) {
      return owner('ownerEnterAValidContactEmail');
    }

    if (application.kind === 'existing' && !application.existingRestaurantId) {
      return owner('ownerChooseARestaurantToClaim');
    }

    if (application.kind === 'new') {
      if (!application.businessNameKo.trim() || !application.businessName.trim()) {
        return owner('ownerEnterTheRestaurantNameInKoreanAndEnglish');
      }
      if (!application.address.trim() || !application.phone.trim()) {
        return owner('ownerEnterTheRestaurantAddressAndPhoneNumber');
      }
    }

    return null;
  }

  async function saveApplicationDraft() {
    const validationError = validateApplication();
    if (validationError) {
      showAlert(owner('ownerCheckTheApplication'), validationError);
      return;
    }
    if (!draftOwnerKey) {
      showAlert(owner('ownerSignInRequired'));
      return;
    }

    setSaving(true);
    try {
      const valueToSave = { ...application, email: application.email.trim() || auth.email || '' };
      await persistApplicationDraft(draftOwnerKey, valueToSave);
      setApplication(valueToSave);
      showAlert(
        owner('ownerDraftSaved'),
        owner('ownerThisDraftIsSavedOnlyOnThisDeviceItHasNotBeenSubmittedToMukji'),
      );
    } catch {
      showAlert(owner('ownerSaveFailed'), owner('ownerPleaseTryAgain'));
    } finally {
      setSaving(false);
    }
  }

  function updateRestaurantField(
    key: keyof Omit<RestaurantDraft, 'dishes'>,
    value: string,
  ) {
    if (!selectedRestaurant) return;
    const restaurantId = selectedRestaurant.id;

    setRestaurantDrafts((current) => {
      const base = current[restaurantId] ?? createRestaurantDraft(selectedRestaurant);
      return { ...current, [restaurantId]: { ...base, [key]: value } };
    });
  }

  function updateDishField(dishId: string, key: keyof Omit<DishDraft, 'id'>, value: string) {
    if (!selectedRestaurant) return;
    const restaurantId = selectedRestaurant.id;

    setRestaurantDrafts((current) => {
      const base = current[restaurantId] ?? createRestaurantDraft(selectedRestaurant);
      return {
        ...current,
        [restaurantId]: {
          ...base,
          dishes: base.dishes.map((dish) =>
            dish.id === dishId ? { ...dish, [key]: value } : dish,
          ),
        },
      };
    });
  }

  function addDishDraft() {
    if (!selectedRestaurant) return;
    const restaurantId = selectedRestaurant.id;
    const newDish: DishDraft = {
      id: `local-draft-${Date.now()}`,
      nameKo: '',
      nameEn: '',
      priceWon: '0',
      contains: '',
      mayContain: '',
      leaveOutKo: '',
      leaveOutEn: '',
    };

    setRestaurantDrafts((current) => {
      const base = current[restaurantId] ?? createRestaurantDraft(selectedRestaurant);
      return {
        ...current,
        [restaurantId]: { ...base, dishes: [...base.dishes, newDish] },
      };
    });
  }

  function removeDishDraft(dishId: string) {
    if (!selectedRestaurant) return;
    showAlert(
      owner('ownerDeleteThisMenuItem'),
      owner('ownerItWillBeRemovedFromThisLocalDraft'),
      [
        { text: owner('ownerKeep'), style: 'cancel' },
        {
          text: owner('ownerDelete'),
          style: 'destructive',
          onPress: () => {
            const restaurantId = selectedRestaurant.id;
            setRestaurantDrafts((current) => {
              const base = current[restaurantId] ?? createRestaurantDraft(selectedRestaurant);
              return {
                ...current,
                [restaurantId]: {
                  ...base,
                  dishes: base.dishes.filter((dish) => dish.id !== dishId),
                },
              };
            });
          },
        },
      ],
    );
  }

  function validateRestaurantDraft(draft: RestaurantDraft): string | null {
    if (!draft.nameKo.trim() || !draft.nameEn.trim() || !draft.address.trim()) {
      return owner('ownerRestaurantNamesAndAddressAreRequired');
    }

    for (const dish of draft.dishes) {
      if (!dish.nameKo.trim() || !dish.nameEn.trim()) {
        return owner('ownerEveryMenuItemNeedsKoreanAndEnglishNames');
      }

      const price = Number(dish.priceWon);
      if (!Number.isInteger(price) || price < 0) {
        return owner('ownerMenuPricesMustBeZeroOrAPositiveWholeNumber');
      }

      const ingredients = [...parseIngredientText(dish.contains), ...parseIngredientText(dish.mayContain)];
      const invalid = ingredients.find(
        (ingredient) => !ALLOWED_INGREDIENTS.includes(ingredient),
      );
      if (invalid) {
        return owner('ownerUnknownIngredientValueUseTheSupportedEnglishIngredientNames', { invalid });
      }

      const contains = parseIngredientText(dish.contains);
      const mayContain = parseIngredientText(dish.mayContain);
      const duplicateAcrossFields = contains.find((ingredient) => mayContain.includes(ingredient));
      if (duplicateAcrossFields) {
        return owner('ownerValueCannotBeInBothContainsAndMayContain', { duplicateAcrossFields });
      }
    }

    return null;
  }

  async function saveRestaurantDraft() {
    if (!selectedRestaurant || !activeDraft || !draftOwnerKey) return;
    const validationError = validateRestaurantDraft(activeDraft);
    if (validationError) {
      showAlert(owner('ownerCheckTheRestaurantDraft'), validationError);
      return;
    }

    setSaving(true);
    try {
      const nextDrafts = { ...restaurantDrafts, [selectedRestaurant.id]: activeDraft };
      await saveRestaurantDrafts(draftOwnerKey, nextDrafts);
      setRestaurantDrafts(nextDrafts);
      showAlert(
        owner('ownerDraftSaved'),
        owner('ownerYourChangesAreSavedOnThisDeviceOnlyTheyAreNotPublishedToMukji'),
      );
    } catch {
      showAlert(owner('ownerSaveFailed'), owner('ownerPleaseTryAgain'));
    } finally {
      setSaving(false);
    }
  }

  async function handleContinueAsGuest() {
    try {
      await continueAsGuest();
      router.replace('/(tabs)/map');
    } catch (error) {
      showAlert(
        owner('ownerCouldNotContinueAsGuest'),
        error instanceof Error ? error.message : owner('ownerPleaseTryAgain'),
      );
    }
  }

  async function handleSignOut() {
    try {
      await signOutAndReturnToWelcome();
      router.replace('/');
    } catch {
      showAlert(
        owner('ownerSignOutFailed'),
        owner('ownerPleaseTryAgain'),
      );
    }
  }

  function renderApplicationForm() {
    return (
      <View style={styles.content}>
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={24} color="#1b5fad" />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{owner('ownerRestaurantOwnerApplication')}</Text>
            <Text style={styles.bodyText}>
              {owner('ownerYourAccountIsSignedInButItIsNotLinkedToARestaurantYetYo6b975e40')}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{owner('ownerWhatWouldYouLikeToDo')}</Text>
        <View style={styles.choiceRow}>
          {(['existing', 'new'] as const).map((kind) => (
            <Pressable
              key={kind}
              onPress={() => updateApplication('kind', kind)}
              style={[styles.choice, application.kind === kind && styles.choiceActive]}>
              <Text style={[styles.choiceText, application.kind === kind && styles.choiceTextActive]}>
                {kind === 'existing'
                  ? owner('ownerClaimExistingRestaurant')
                  : owner('ownerRegisterNewRestaurant')}
              </Text>
            </Pressable>
          ))}
        </View>

        {application.kind === 'existing' ? (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{owner('ownerChooseTheRestaurant')}</Text>
            {restaurants.length === 0 ? (
              <Text style={styles.bodyText}>
                {owner('ownerNoRestaurantListIsAvailableRightNowYouCanSaveThisDraftA344e33fa')}
              </Text>
            ) : (
              restaurants.map((restaurant) => (
                <Pressable
                  key={restaurant.id}
                  onPress={() => updateApplication('existingRestaurantId', restaurant.id)}
                  style={[
                    styles.restaurantChoice,
                    application.existingRestaurantId === restaurant.id && styles.restaurantChoiceActive,
                  ]}>
                  <View style={styles.flex}>
                    <Text style={styles.restaurantName}>{restaurant.nameEn}</Text>
                    <Text style={styles.mutedText}>
                      {restaurant.nameKo} · {restaurant.address}
                    </Text>
                  </View>
                  <Ionicons
                    name={application.existingRestaurantId === restaurant.id ? 'radio-button-on' : 'radio-button-off'}
                    size={21}
                    color="#1b5fad"
                  />
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Field
              label={owner('ownerRestaurantNameKorean')}
              value={application.businessNameKo}
              onChangeText={(value) => updateApplication('businessNameKo', value)}
            />
            <Field
              label={owner('ownerRestaurantNameEnglish')}
              value={application.businessName}
              onChangeText={(value) => updateApplication('businessName', value)}
            />
            <Field
              label={owner('ownerRestaurantAddress')}
              value={application.address}
              onChangeText={(value) => updateApplication('address', value)}
              multiline
            />
            <Field
              label={owner('ownerRestaurantPhone')}
              value={application.phone}
              onChangeText={(value) => updateApplication('phone', value)}
              keyboardType="phone-pad"
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{owner('ownerOwnerInformation')}</Text>
          <Field
            label={owner('ownerOwnerName')}
            value={application.ownerName}
            onChangeText={(value) => updateApplication('ownerName', value)}
          />
          <Field
            label={owner('ownerContactEmail')}
            value={application.email || auth.email || ''}
            onChangeText={(value) => updateApplication('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label={owner('ownerAdditionalMessageOptional')}
            value={application.message}
            onChangeText={(value) => updateApplication('message', value)}
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{owner('ownerHalalInformation')}</Text>
          <Text style={styles.bodyText}>
            {owner('ownerChooseTheStatementThatBestDescribesTheRestaurantTheMukj7ef4d9e9')}
          </Text>
          {([
            ['not_claiming', 'ownerNotClaimingHalalCertification'],
            ['certified', 'ownerWeHaveAHalalCertificate'],
            ['not_certified', 'ownerHalalFriendlyNotCertified'],
          ] as const).map(([value, labelKey]) => (
            <Pressable
              key={value}
              onPress={() => updateApplication('halalClaim', value)}
              style={styles.radioRow}>
              <Ionicons
                name={application.halalClaim === value ? 'radio-button-on' : 'radio-button-off'}
                size={21}
                color="#1b5fad"
              />
              <Text style={styles.bodyText}>{owner(labelKey)}</Text>
            </Pressable>
          ))}
          <View style={styles.uploadPlaceholder}>
            <Ionicons name="document-attach-outline" size={22} color="#6b7a8d" />
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>{owner('ownerBusinessDocument')}</Text>
              <Text style={styles.mutedText}>{owner('ownerDocumentUploadIsNotConnectedYet')}</Text>
            </View>
          </View>
          <View style={styles.uploadPlaceholder}>
            <Ionicons name="ribbon-outline" size={22} color="#6b7a8d" />
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>{owner('ownerHalalCertificateIfApplicable')}</Text>
              <Text style={styles.mutedText}>
                {owner('ownerCertificateUploadAndVerificationAreNotConnectedYet')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>{owner('ownerDraftOnlyNotSubmitted')}</Text>
          <Text style={styles.bodyText}>
            {owner('ownerThisApplicationIsStoredOnThisDeviceOnlyItIsNotPendingAp09969516')}
          </Text>
        </View>
        <Pressable
          style={[styles.signOutButton, { borderColor: '#b8cce5', backgroundColor: '#eef4fb' }]}
          onPress={() => {
            void switchToUserMode().then(() => router.replace('/(tabs)/map'));
          }}
          accessibilityRole="button">
          <Ionicons name="swap-horizontal-outline" size={20} color="#1b5fad" />
          <Text style={[styles.signOutText, { color: '#1b5fad' }]}>
            {owner('ownerSwitchToUserMode')}
          </Text>
        </Pressable>
        <PrimaryButton
          title={saving ? owner('ownerSaving') : owner('ownerSaveApplicationDraft')}
          onPress={() => void saveApplicationDraft()}
          disabled={saving || draftsLoading}
        />
      </View>
    );
  }

  function renderOverview() {
    if (!selectedRestaurant || !activeDraft) return null;
    return (
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{owner('ownerOWNERDASHBOARD')}</Text>
          <Text style={styles.heroTitle}>{activeDraft.nameEn || selectedRestaurant.nameEn}</Text>
          <Text style={styles.heroSubtitle}>{activeDraft.nameKo || selectedRestaurant.nameKo}</Text>
          <Text style={styles.heroAddress}>{activeDraft.address || selectedRestaurant.address}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeDraft.dishes.length}</Text>
            <Text style={styles.statLabel}>{owner('ownerMenuItems')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{selectedRestaurant.recommendCount}</Text>
            <Text style={styles.statLabel}>{owner('ownerRecommendations')}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{owner('ownerRestaurantInformation')}</Text>
          <Text style={styles.bodyText}>{owner('ownerPhone')} {activeDraft.phone || '-'}</Text>
          <Text style={styles.bodyText}>{owner('ownerAddress')} {activeDraft.address}</Text>
          <Text style={styles.bodyText}>
            {owner('ownerHalalCertification')} {selectedRestaurant.halalCertified
              ? owner('ownerMarkedAsCertified')
              : owner('ownerNotMarkedAsCertified')}
          </Text>
          <Text style={styles.mutedText}>
            {owner('ownerCertificationStatusIsControlledByMukjiVerificationAndCaca872849')}
          </Text>
        </View>
        <View style={styles.noticeCard}>
          <Ionicons name="cloud-offline-outline" size={23} color="#1b5fad" />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{owner('ownerLocalPreviewMode')}</Text>
            <Text style={styles.bodyText}>
              {owner('ownerEditsAreSavedOnThisDeviceOnlyTheyAreNotPublishedToThePu55e749e4')}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  function renderRestaurantEditor() {
    if (!selectedRestaurant || !activeDraft) return null;
    return (
      <View style={styles.content}>
        <View style={styles.noticeCard}>
          <Ionicons name="save-outline" size={22} color="#1b5fad" />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{owner('ownerLocalDraftEditor')}</Text>
            <Text style={styles.bodyText}>
              {owner('ownerChangesHereDoNotUpdateThePublicRestaurantPage')}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <Field label={owner('ownerRestaurantNameKorean')} value={activeDraft.nameKo} onChangeText={(value) => updateRestaurantField('nameKo', value)} />
          <Field label={owner('ownerRestaurantNameEnglish')} value={activeDraft.nameEn} onChangeText={(value) => updateRestaurantField('nameEn', value)} />
          <Field label={owner('ownerAddress2')} value={activeDraft.address} onChangeText={(value) => updateRestaurantField('address', value)} multiline />
          <Field label={owner('ownerPhoneNumber')} value={activeDraft.phone} onChangeText={(value) => updateRestaurantField('phone', value)} keyboardType="phone-pad" />
          <Field
            label={owner('ownerIngredientOriginsOneItemPerLineItemCountry')}
            value={activeDraft.originText}
            onChangeText={(value) => updateRestaurantField('originText', value)}
            multiline
            placeholder={owner('ownerExampleBeefAustralia')}
          />
        </View>
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>{owner('ownerHalalCertificationIsReadOnly')}</Text>
          <Text style={styles.bodyText}>
            {owner('ownerThePublicCertificationValueIsControlledByMukjiVerificat7444e7da')}
          </Text>
        </View>
        <PrimaryButton
          title={saving ? owner('ownerSaving') : owner('ownerSaveLocalDraft')}
          onPress={() => void saveRestaurantDraft()}
          disabled={saving || draftsLoading}
        />
      </View>
    );
  }

  function renderMenuEditor() {
    if (!selectedRestaurant || !activeDraft) return null;
    return (
      <View style={styles.content}>
        <View style={styles.noticeCard}>
          <Ionicons name="restaurant-outline" size={22} color="#1b5fad" />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{owner('ownerMenuDraftEditor')}</Text>
            <Text style={styles.bodyText}>
              {owner('ownerUseTheseIngredientNamesPorkBeefChickenSeafoodEggDairyAlfd029abb')}
            </Text>
          </View>
        </View>

        {activeDraft.dishes.map((dish, index) => (
          <View key={dish.id} style={styles.card}>
            <View style={styles.menuHeader}>
              <Text style={styles.cardTitle}>{owner('ownerMenuItem')} {index + 1}</Text>
              <Pressable onPress={() => removeDishDraft(dish.id)} hitSlop={10} accessibilityRole="button">
                <Ionicons name="trash-outline" size={21} color="#b3261e" />
              </Pressable>
            </View>
            <Field label={owner('ownerNameKorean')} value={dish.nameKo} onChangeText={(value) => updateDishField(dish.id, 'nameKo', value)} />
            <Field label={owner('ownerNameEnglish')} value={dish.nameEn} onChangeText={(value) => updateDishField(dish.id, 'nameEn', value)} />
            <Field label={owner('ownerPriceKRW')} value={dish.priceWon} onChangeText={(value) => updateDishField(dish.id, 'priceWon', value.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
            <Field label={owner('ownerContains')} value={dish.contains} onChangeText={(value) => updateDishField(dish.id, 'contains', value)} placeholder={owner('ownerExampleChickenWheat')} autoCapitalize="none" />
            <Field label={owner('ownerMayContainAskFirst')} value={dish.mayContain} onChangeText={(value) => updateDishField(dish.id, 'mayContain', value)} placeholder={owner('ownerExampleDairySoy')} autoCapitalize="none" />
            <Field label={owner('ownerOrderingConditionKorean')} value={dish.leaveOutKo} onChangeText={(value) => updateDishField(dish.id, 'leaveOutKo', value)} placeholder={owner('ownerExampleRemoveSauceKorean')} />
            <Field label={owner('ownerOrderingConditionEnglish')} value={dish.leaveOutEn} onChangeText={(value) => updateDishField(dish.id, 'leaveOutEn', value)} placeholder={owner('ownerExampleNoSaucePlease')} />
          </View>
        ))}

        <Pressable style={styles.secondaryButton} onPress={addDishDraft} accessibilityRole="button">
          <Ionicons name="add-circle-outline" size={20} color="#1b5fad" />
          <Text style={styles.secondaryButtonText}>{owner('ownerAddMenuItemToDraft')}</Text>
        </Pressable>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>{owner('ownerDoNotGuessIngredients')}</Text>
          <Text style={styles.bodyText}>
            {owner('ownerOnlyEnterIngredientsTheRestaurantCanConfirmIfSomethingI47adfbc3')}
          </Text>
        </View>
        <PrimaryButton
          title={saving ? owner('ownerSaving') : owner('ownerSaveMenuDraft')}
          onPress={() => void saveRestaurantDraft()}
          disabled={saving || draftsLoading}
        />
      </View>
    );
  }

  function renderReservations() {
    return (
      <View style={styles.content}>
        {/* #50 booking requests from Supabase; a customer's cancellation shows as an alert */}
        <OwnerReservations restaurants={ownedRestaurants} />
      </View>
    );
  }

  function renderSettings() {
    return (
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{owner('ownerAccount')}</Text>
          <Text style={styles.bodyText}>{auth.email ?? '-'}</Text>
          <Text style={styles.mutedText}>
            {owner('ownerOwnerAccessIsBasedOnRestaurantLinksAssignedByTheMukjiTeam')}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{owner('ownerHelpAndSupport')}</Text>
          <Text style={styles.bodyText}>
            {owner('ownerForRestaurantOwnershipCertificationOrPublicDataCorrecti620066e6')}
          </Text>
        </View>
        <Pressable
          style={[styles.signOutButton, { borderColor: '#b8cce5', backgroundColor: '#eef4fb' }]}
          onPress={() => {
            void switchToUserMode().then(() => router.replace('/(tabs)/map'));
          }}
          accessibilityRole="button">
          <Ionicons name="swap-horizontal-outline" size={20} color="#1b5fad" />
          <Text style={[styles.signOutText, { color: '#1b5fad' }]}>{owner('ownerSwitchToUserMode')}</Text>
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={() => void handleSignOut()} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={20} color="#b3261e" />
          <Text style={styles.signOutText}>{owner('ownerSignOut')}</Text>
        </Pressable>
      </View>
    );
  }

  const tabs: { key: PortalTab; label: OwnerPortalTranslationKey; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'overview', label: 'ownerOverview', icon: 'grid-outline' },
    { key: 'restaurant', label: 'ownerRestaurant', icon: 'storefront-outline' },
    { key: 'menu', label: 'ownerMenu', icon: 'restaurant-outline' },
    { key: 'reservations', label: 'ownerReservations', icon: 'calendar-outline' },
    { key: 'settings', label: 'ownerSettings', icon: 'settings-outline' },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: owner('ownerMukjiOwnerPortal') }} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {previewMode && (
          <View style={[styles.noticeCard, { margin: 16, marginBottom: 0 }]}>
            <Ionicons name="eye-outline" size={22} color="#1b5fad" />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{owner('ownerTemporaryPreviewNotOwnerAccess')}</Text>
              <Text style={styles.bodyText}>{owner('ownerYouCanInspectTheOwnerDashboardAndEditLocalSampleDraftsN85e67155')}</Text>
              <Pressable onPress={() => router.replace('/(tabs)/profile')} accessibilityRole="button">
                <Text style={[styles.secondaryButtonText, { marginTop: 8 }]}>{owner('ownerExitPreview')}</Text>
              </Pressable>
            </View>
          </View>
        )}
        {!auth.ready || loading || draftsLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#1b5fad" />
            <Text style={styles.mutedText}>{owner('ownerLoadingOwnerPortal')}</Text>
          </View>
        ) : !signedInAsOwner && !previewMode ? (
          <View style={styles.emptyCard}>
            <Ionicons name="lock-closed-outline" size={48} color="#1b5fad" />
            <Text style={styles.cardTitle}>{owner('ownerOwnerSignInRequired')}</Text>
            <Text style={styles.bodyText}>{owner('ownerSignInWithYourRestaurantOwnerEmailToContinue')}</Text>
            <PrimaryButton title={owner('ownerGoToOwnerLogin')} onPress={() => router.replace('/owner-login')} />
            <PrimaryButton
              title={owner('ownerBackToUserModeContinueAsGuest')}
              onPress={() => void handleContinueAsGuest()}
            />
          </View>
        ) : portalError ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={42} color="#b3261e" />
            <Text style={styles.cardTitle}>{owner('ownerCouldNotLoadOwnerInformation')}</Text>
            <Text style={styles.bodyText}>{portalError}</Text>
            <PrimaryButton title={owner('ownerTryAgain')} onPress={() => router.replace('/owner')} />
          </View>
        ) : draftError ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={42} color="#b3261e" />
            <Text style={styles.cardTitle}>{owner('ownerCouldNotLoadSavedDrafts')}</Text>
            <Text style={styles.bodyText}>{draftError}</Text>
            <PrimaryButton title={owner('ownerContinueWithoutDrafts')} onPress={() => setDraftError('')} />
          </View>
        ) : ownedRestaurants.length === 0 ? (
          renderApplicationForm()
        ) : (
          <>
            <View style={styles.topHeader}>
              <View style={styles.flex}>
                <Text style={styles.pageTitle}>{owner('ownerOwnerPortal')}</Text>
                <Text style={styles.mutedText}>{owner('ownerManageYourRestaurantInformation')}</Text>
              </View>
              <View style={styles.ownerAvatar}><Ionicons name="person" size={21} color="#1b5fad" /></View>
            </View>

            {ownedRestaurants.length > 1 && (
              <View style={styles.restaurantPicker}>
                <Text style={styles.fieldLabel}>{owner('ownerYourRestaurants')}</Text>
                {ownedRestaurants.map((restaurant) => (
                  <Pressable
                    key={restaurant.id}
                    onPress={() => setSelectedRestaurantId(restaurant.id)}
                    style={[styles.restaurantChoice, selectedRestaurant?.id === restaurant.id && styles.restaurantChoiceActive]}>
                    <View style={styles.flex}>
                      <Text style={styles.restaurantName}>{restaurant.nameEn}</Text>
                      <Text style={styles.mutedText}>{restaurant.nameKo}</Text>
                    </View>
                    <Ionicons name={selectedRestaurant?.id === restaurant.id ? 'radio-button-on' : 'radio-button-off'} size={21} color="#1b5fad" />
                  </Pressable>
                ))}
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {tabs.map((tab) => (
                <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}>
                  <Ionicons name={tab.icon} size={17} color={activeTab === tab.key ? '#fff' : '#6b7a8d'} />
                  <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>{owner(tab.label)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'restaurant' && renderRestaurantEditor()}
            {activeTab === 'menu' && renderMenuEditor()}
            {activeTab === 'reservations' && renderReservations()}
            {activeTab === 'settings' && renderSettings()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7fa' },
  page: { paddingBottom: 36 },
  flex: { flex: 1 },
  loading: { padding: 40, alignItems: 'center', gap: 12 },
  content: { padding: 16, gap: 14 },
  topHeader: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageTitle: { fontSize: 25, fontWeight: '800', color: '#14213d' },
  ownerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e8f0fb', alignItems: 'center', justifyContent: 'center' },
  heroCard: { padding: 20, borderRadius: 18, backgroundColor: '#1b5fad', gap: 6 },
  eyebrow: { color: '#d9e8fa', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 23, fontWeight: '800' },
  heroSubtitle: { color: '#e8f0fb', fontSize: 15 },
  heroAddress: { color: '#e8f0fb', fontSize: 12, marginTop: 5 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 16, backgroundColor: '#fff', borderRadius: 14, gap: 4 },
  statNumber: { fontSize: 25, fontWeight: '800', color: '#14213d' },
  statLabel: { fontSize: 12, color: '#6b7a8d' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 14, gap: 12 },
  cardTitle: { color: '#14213d', fontSize: 16, fontWeight: '700' },
  sectionTitle: { color: '#14213d', fontSize: 18, fontWeight: '800' },
  bodyText: { color: '#536273', fontSize: 13, lineHeight: 20 },
  mutedText: { color: '#8290a0', fontSize: 12, lineHeight: 18 },
  noticeCard: { backgroundColor: '#e8f0fb', padding: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  warningCard: { backgroundColor: '#fff4df', padding: 15, borderRadius: 14, gap: 7 },
  warningTitle: { color: '#8a5a00', fontWeight: '800', fontSize: 14 },
  field: { gap: 6 },
  fieldLabel: { color: '#344256', fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#d5dde7', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: '#14213d', fontSize: 14 },
  multilineInput: { minHeight: 90, textAlignVertical: 'top' },
  choiceRow: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, borderWidth: 1, borderColor: '#d5dde7', backgroundColor: '#fff', borderRadius: 11, padding: 12, justifyContent: 'center' },
  choiceActive: { borderColor: '#1b5fad', backgroundColor: '#e8f0fb' },
  choiceText: { color: '#536273', fontWeight: '600', fontSize: 12, textAlign: 'center' },
  choiceTextActive: { color: '#1b5fad' },
  restaurantChoice: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e1e7ef', backgroundColor: '#fff', gap: 10, marginTop: 8 },
  restaurantChoiceActive: { borderColor: '#1b5fad', backgroundColor: '#f0f5fc' },
  restaurantName: { color: '#14213d', fontSize: 14, fontWeight: '700' },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5 },
  uploadPlaceholder: { borderWidth: 1, borderColor: '#d5dde7', borderStyle: 'dashed', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryButton: { backgroundColor: '#1b5fad', padding: 15, borderRadius: 11, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  disabledButton: { opacity: 0.55 },
  secondaryButton: { borderWidth: 1, borderColor: '#1b5fad', backgroundColor: '#fff', padding: 14, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { color: '#1b5fad', fontWeight: '700' },
  restaurantPicker: { marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 13, backgroundColor: '#fff' },
  tabRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  tabButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff' },
  tabButtonActive: { backgroundColor: '#1b5fad' },
  tabButtonText: { color: '#6b7a8d', fontSize: 12, fontWeight: '700' },
  tabButtonTextActive: { color: '#fff' },
  emptyCard: { margin: 16, padding: 24, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', gap: 12 },
  pendingBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff4df' },
  pendingBadgeText: { color: '#8a5a00', fontSize: 11, fontWeight: '800' },
  signOutButton: { borderWidth: 1, borderColor: '#e5b7b4', borderRadius: 11, padding: 14, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  signOutText: { color: '#b3261e', fontWeight: '800' },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
