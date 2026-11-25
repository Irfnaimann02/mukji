import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentRef } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { OwnerDashboard } from '@/components/owner-dashboard';
import { OwnerMenuManagement } from '@/components/owner-menu-management';
import { OwnerRestaurantManagement } from '@/components/owner-restaurant-management';
import type { Restaurant } from '@/data/types';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import type { OwnerPortalTranslationKey } from '@/i18n/translations';
import { continueAsGuest } from '@/logic/welcome-service';
import { signOutAndReturnToWelcome } from '@/logic/session-service';
import {
  createRestaurantDraft,
  loadOwnerDrafts,
  loadOwnerPortalRestaurants,
  saveRestaurantDrafts,
  switchToUserMode,
  type RestaurantDraft,
} from '@/logic/owner-portal-service';
import { showAlert } from '@/components/show-alert';
import { userMessage } from '@/logic/user-error';
import { OwnerPortalColors, OwnerPortalRadii, OwnerPortalSpacing } from '@/constants/owner-portal-theme';

type PortalTab = 'home' | 'restaurants' | 'menus' | 'reservations' | 'more';

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
        placeholderTextColor={OwnerPortalColors.muted}
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

const tabs: { key: PortalTab; label: OwnerPortalTranslationKey; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'ownerPortalHome', icon: 'home-outline', activeIcon: 'home' },
  { key: 'restaurants', label: 'ownerPortalRestaurants', icon: 'storefront-outline', activeIcon: 'storefront' },
  { key: 'menus', label: 'ownerPortalMenus', icon: 'restaurant-outline', activeIcon: 'restaurant' },
  { key: 'reservations', label: 'ownerReservations', icon: 'calendar-outline', activeIcon: 'calendar' },
  { key: 'more', label: 'ownerPortalMore', icon: 'ellipsis-horizontal', activeIcon: 'ellipsis-horizontal' },
];

export default function OwnerPortalScreen() {
  const auth = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  // Preview is a development-only entry path and must not require an owner login.
  const previewMode = __DEV__ && params.preview === '1';
  const { owner, language } = useTranslation();
  const { profile, setProfile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [draftError, setDraftError] = useState('');
  const [ownedRestaurants, setOwnedRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [restaurantPickerOpen, setRestaurantPickerOpen] = useState(false);
  const [restaurantDrafts, setRestaurantDrafts] = useState<Record<string, RestaurantDraft>>({});
  const contentScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

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
        setRestaurantDrafts(savedDrafts.restaurantDrafts);
      } catch (error) {
        if (!alive) return;
        setDraftError(userMessage(error, owner('ownerSavedDraftsCouldNotBeRead')));
      } finally {
        if (alive) setDraftsLoading(false);
      }
    }

    void loadDrafts();

    return () => {
      alive = false;
    };
  }, [auth.ready, auth.isAnonymous, draftOwnerKey, previewMode, owner]);

  // Restaurant ownership is assigned by the MUKJI team in Supabase.
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
        const { ownedRestaurants: linked } = await loadOwnerPortalRestaurants(previewMode);
        if (!alive) return;
        setOwnedRestaurants(linked);
        setSelectedRestaurantId((current) =>
          linked.some((restaurant) => restaurant.id === current)
            ? current
            : linked[0]?.id ?? '',
        );
      } catch (error) {
        if (!alive) return;
        setPortalError(userMessage(error, owner('ownerCouldNotLoadYourOwnerInformation')));
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadOwnerData();

    return () => {
      alive = false;
    };
  }, [auth.ready, auth.user?.id, signedInAsOwner, previewMode, owner]);

  function changeTab(tab: PortalTab) {
    setActiveTab(tab);
    setRestaurantPickerOpen(false);
    contentScrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function updateOriginDraft(value: string) {
    if (!selectedRestaurant) return;
    const restaurantId = selectedRestaurant.id;
    setRestaurantDrafts((current) => {
      const base = current[restaurantId] ?? createRestaurantDraft(selectedRestaurant);
      return { ...current, [restaurantId]: { ...base, originText: value } };
    });
  }

  async function saveRestaurantDraft() {
    if (!selectedRestaurant || !activeDraft || !draftOwnerKey) return;
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
        userMessage(error, owner('ownerPleaseTryAgain')),
      );
    }
  }

  async function handleSignOut() {
    try {
      await signOutAndReturnToWelcome();
      router.replace('/');
    } catch {
      showAlert(owner('ownerSignOutFailed'), owner('ownerPleaseTryAgain'));
    }
  }

  function renderApplicationForm() {
    return (
      <View style={styles.content}>
        <View style={styles.applicationIntro}>
          <View style={styles.brandMark}><Ionicons name="restaurant" size={23} color={OwnerPortalColors.orange} /></View>
          <Text style={styles.pageTitle}>{owner('ownerRestaurantOwnerApplication')}</Text>
          <Text style={styles.bodyText}>{owner('ownerYourAccountIsSignedInButItIsNotLinkedToARestaurantYetYo6b975e40')}</Text>
        </View>
        <OwnerDashboard restaurants={[]} previewMode={previewMode} />
        <View style={styles.noticeCard}>
          <Ionicons name="document-text-outline" size={23} color={OwnerPortalColors.orange} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{owner('ownerBusinessOnboarding')}</Text>
            <Text style={styles.bodyText}>{owner('ownerRestaurantApplicationIntro')}</Text>
          </View>
        </View>
        <PrimaryButton title={owner('ownerBusinessOnboarding')} onPress={() => router.push('/owner-business')} disabled={draftsLoading} />
        <PrimaryButton title={owner('ownerRestaurantApplicationTitle')} onPress={() => router.push('/owner-restaurant-application')} disabled={draftsLoading} />
        <Text style={styles.mutedText}>{owner('ownerForRestaurantOwnershipCertificationOrPublicDataCorrecti620066e6')}</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => { void switchToUserMode().then(() => router.replace('/(tabs)/map')); }}
          accessibilityRole="button">
          <Ionicons name="swap-horizontal-outline" size={19} color={OwnerPortalColors.orange} />
          <Text style={styles.secondaryButtonText}>{owner('ownerSwitchToUserMode')}</Text>
        </Pressable>
      </View>
    );
  }

  function renderHome() {
    return (
      <View style={styles.screenContent}>
        <OwnerDashboard restaurants={ownedRestaurants} selectedRestaurant={selectedRestaurant} previewMode={previewMode} />
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>{owner('ownerPortalQuickActions')}</Text>
          <View style={styles.quickActions}>
            <QuickAction icon="calendar-outline" label={owner('ownerReservations')} onPress={() => changeTab('reservations')} />
            <QuickAction icon="restaurant-outline" label={owner('ownerMenu')} onPress={() => changeTab('menus')} />
            <QuickAction icon="storefront-outline" label={owner('ownerRestaurant')} onPress={() => changeTab('restaurants')} />
          </View>
        </View>
      </View>
    );
  }

  function renderRestaurants() {
    return (
      <View style={styles.screenContent}>
        <View style={styles.screenHeading}>
          <Text style={styles.pageTitle}>{owner('ownerPortalRestaurants')}</Text>
          <Text style={styles.mutedText}>{owner('ownerManageYourRestaurantInformation')}</Text>
        </View>
        {selectedRestaurant ? (
          <View style={styles.restaurantSummaryCard}>
            <View style={styles.restaurantSummaryIcon}><Ionicons name="storefront" size={24} color={OwnerPortalColors.orange} /></View>
            <View style={styles.flex}>
              <Text style={styles.restaurantName}>{selectedRestaurant.nameEn || selectedRestaurant.nameKo}</Text>
              <Text style={styles.mutedText}>{selectedRestaurant.nameKo}</Text>
              <Text style={styles.mutedText} numberOfLines={2}>{selectedRestaurant.address}</Text>
            </View>
            <View style={styles.activePill}><Text style={styles.activePillText}>{owner('ownerPortalLinked')}</Text></View>
          </View>
        ) : null}
        <OwnerRestaurantManagement restaurant={selectedRestaurant} previewMode={previewMode} />
        {selectedRestaurant && activeDraft ? (
          <View style={styles.content}>
            <View style={styles.noticeCard}>
              <Ionicons name="save-outline" size={21} color={OwnerPortalColors.orange} />
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{owner('ownerLocalDraftEditor')}</Text>
                <Text style={styles.bodyText}>{owner('ownerChangesHereDoNotUpdateThePublicRestaurantPage')}</Text>
              </View>
            </View>
            <View style={styles.card}>
              <Field label={owner('ownerIngredientOriginsOneItemPerLineItemCountry')} value={activeDraft.originText} onChangeText={updateOriginDraft} multiline placeholder={owner('ownerExampleBeefAustralia')} />
            </View>
            <PrimaryButton title={saving ? owner('ownerSaving') : owner('ownerSaveLocalDraft')} onPress={() => void saveRestaurantDraft()} disabled={saving || draftsLoading} />
          </View>
        ) : null}
      </View>
    );
  }

  function renderMenus() {
    if (!selectedRestaurant) return null;
    return (
      <View style={styles.screenContent}>
        <View style={styles.screenHeading}>
          <Text style={styles.pageTitle}>{owner('ownerPortalMenus')}</Text>
          <Text style={styles.mutedText}>{owner('ownerPortalMenuSubtitle')}</Text>
        </View>
        <OwnerMenuManagement restaurant={selectedRestaurant} previewMode={previewMode} />
      </View>
    );
  }

  function renderReservations() {
    if (previewMode && !signedInAsOwner) {
      return (
        <View style={styles.screenContent}>
          <View style={styles.screenHeading}>
            <Text style={styles.pageTitle}>{owner('ownerReservations')}</Text>
            <Text style={styles.mutedText}>{owner('ownerPreviewReservationsSubtitle')}</Text>
          </View>
          <View style={styles.previewFootnote}>
            <Ionicons name="lock-closed-outline" size={17} color={OwnerPortalColors.orange} />
            <Text style={styles.mutedText}>{owner('ownerPreviewReservationsLocked')}</Text>
          </View>
          <PrimaryButton title={owner('ownerGoToOwnerLogin')} onPress={() => router.push('/owner-login')} />
        </View>
      );
    }

    return (
      <View style={styles.screenContent}>
        <Text style={[styles.mutedText, { paddingHorizontal: OwnerPortalSpacing.md }]}>{owner('ownerPortalReservationsSubtitle')}</Text>
        {ownedRestaurants.length > 1 ? <Text style={[styles.mutedText, { paddingHorizontal: OwnerPortalSpacing.md }]}>{owner('ownerPortalReservationsAllBranchesNote')}</Text> : null}
        <OwnerReservations restaurants={ownedRestaurants} />
      </View>
    );
  }

  function renderMore() {
    return (
      <View style={styles.screenContent}>
        <View style={styles.screenHeading}>
          <Text style={styles.pageTitle}>{owner('ownerPortalMore')}</Text>
          <Text style={styles.mutedText}>{owner('ownerPortalMoreSubtitle')}</Text>
        </View>
        <View style={styles.accountCard}>
          <View style={styles.accountAvatar}><Ionicons name="person" size={23} color={OwnerPortalColors.orange} /></View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{owner('ownerAccount')}</Text>
            <Text style={styles.mutedText}>{auth.email ?? '-'}</Text>
          </View>
        </View>
        <View style={styles.menuCard}>
          <Pressable
            style={styles.moreAction}
            onPress={() => setProfile({ ...profile, language: language === 'en' ? 'ko' : 'en' })}
            accessibilityRole="button"
            accessibilityLabel={language === 'en' ? 'Switch language to Korean' : '언어를 영어로 변경'}>
            <Ionicons name="language-outline" size={21} color={OwnerPortalColors.orange} />
            <View style={styles.flex}>
              <Text style={styles.moreActionText}>{language === 'en' ? 'Language / 언어' : '언어 / Language'}</Text>
              <Text style={styles.mutedText}>{language === 'en' ? 'English' : '한국어'}</Text>
            </View>
            <View style={styles.languagePill}><Text style={styles.languagePillText}>{language.toUpperCase()}</Text></View>
          </Pressable>
          <View style={styles.rowDivider} />
          <MoreRow icon="help-circle-outline" label={owner('ownerHelpAndSupport')} />
          <View style={styles.rowDivider} />
          <MoreRow icon="document-text-outline" label={owner('ownerPortalTerms')} />
        </View>
        <View style={styles.menuCard}>
          <Pressable style={styles.moreAction} onPress={() => { void switchToUserMode().then(() => router.replace('/(tabs)/map')); }} accessibilityRole="button">
            <Ionicons name="swap-horizontal-outline" size={21} color={OwnerPortalColors.orange} />
            <Text style={styles.moreActionText}>{owner('ownerSwitchToUserMode')}</Text>
            <Ionicons name="chevron-forward" size={18} color={OwnerPortalColors.muted} />
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable style={styles.moreAction} onPress={() => void handleSignOut()} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={21} color={OwnerPortalColors.danger} />
            <Text style={[styles.moreActionText, { color: OwnerPortalColors.danger }]}>{owner('ownerSignOut')}</Text>
            <Ionicons name="chevron-forward" size={18} color={OwnerPortalColors.muted} />
          </Pressable>
        </View>
        <View style={styles.brandFooter}>
          <View style={styles.brandMark}><Ionicons name="restaurant" size={24} color={OwnerPortalColors.orange} /></View>
          <Text style={styles.brandFooterTitle}>MUKJI</Text>
          <Text style={styles.mutedText}>{owner('ownerPortalFooter')}</Text>
        </View>
      </View>
    );
  }

  const activeContent = () => {
    switch (activeTab) {
      case 'home': return renderHome();
      case 'restaurants': return renderRestaurants();
      case 'menus': return renderMenus();
      case 'reservations': return renderReservations();
      case 'more': return renderMore();
      default: return renderHome();
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      {!auth.ready || loading || draftsLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={OwnerPortalColors.orange} />
          <Text style={styles.mutedText}>{owner('ownerLoadingOwnerPortal')}</Text>
        </View>
      ) : !signedInAsOwner && !previewMode ? (
        <View style={styles.emptyCard}>
          <Ionicons name="lock-closed-outline" size={48} color={OwnerPortalColors.orange} />
          <Text style={styles.cardTitle}>{owner('ownerOwnerSignInRequired')}</Text>
          <Text style={styles.bodyText}>{owner('ownerSignInWithYourRestaurantOwnerEmailToContinue')}</Text>
          <PrimaryButton title={owner('ownerGoToOwnerLogin')} onPress={() => router.replace('/owner-login')} />
          <PrimaryButton title={owner('ownerBackToUserModeContinueAsGuest')} onPress={() => void handleContinueAsGuest()} />
        </View>
      ) : portalError ? (
        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={42} color={OwnerPortalColors.danger} />
          <Text style={styles.cardTitle}>{owner('ownerCouldNotLoadOwnerInformation')}</Text>
          <Text style={styles.bodyText}>{portalError}</Text>
          <PrimaryButton title={owner('ownerTryAgain')} onPress={() => router.replace('/owner')} />
        </View>
      ) : draftError ? (
        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={42} color={OwnerPortalColors.danger} />
          <Text style={styles.cardTitle}>{owner('ownerCouldNotLoadSavedDrafts')}</Text>
          <Text style={styles.bodyText}>{draftError}</Text>
          <PrimaryButton title={owner('ownerContinueWithoutDrafts')} onPress={() => setDraftError('')} />
        </View>
      ) : ownedRestaurants.length === 0 ? (
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          {previewMode ? <PreviewNotice onExit={() => router.replace('/(tabs)/profile')} owner={owner} /> : null}
          {renderApplicationForm()}
        </ScrollView>
      ) : (
        <View style={styles.portalLayout}>
          <View style={styles.mainWorkspace}>
            <ScrollView ref={contentScrollRef} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.brandHeader}>
                <View style={styles.brandWordmark}>
                  <View style={styles.brandMarkSmall}><Ionicons name="restaurant" size={17} color="#fff" /></View>
                  <Text style={styles.brandName}>MUKJI</Text>
                </View>
                <View style={styles.headerRight}>
                  {previewMode ? <View style={styles.previewPill}><Text style={styles.previewPillText}>{owner('ownerPreviewBadge')}</Text></View> : null}
                  <View style={styles.ownerAvatar}><Ionicons name="person" size={19} color={OwnerPortalColors.orange} /></View>
                </View>
              </View>
              {previewMode ? <PreviewNotice onExit={() => router.replace('/(tabs)/profile')} owner={owner} /> : null}
              <Pressable
                style={styles.restaurantSelector}
                onPress={() => ownedRestaurants.length > 1 && setRestaurantPickerOpen((open) => !open)}
                accessibilityRole={ownedRestaurants.length > 1 ? 'button' : undefined}
                accessibilityLabel={owner('ownerPortalSelectedRestaurant')}>
                <View style={styles.selectorIcon}><Ionicons name="storefront" size={23} color={OwnerPortalColors.orange} /></View>
                <View style={styles.flex}>
                  <Text style={styles.selectorName} numberOfLines={1}>{selectedRestaurant?.nameEn || selectedRestaurant?.nameKo || owner('ownerPortalSelectedRestaurant')}</Text>
                  <Text style={styles.selectorSub} numberOfLines={1}>{selectedRestaurant?.nameKo || selectedRestaurant?.address || ''}</Text>
                </View>
                {ownedRestaurants.length > 1 ? <Ionicons name={restaurantPickerOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#fff" /> : null}
              </Pressable>
              {restaurantPickerOpen ? (
                <View style={styles.restaurantDropdown}>
                  {ownedRestaurants.map((restaurant) => (
                    <Pressable
                      key={restaurant.id}
                      onPress={() => { setSelectedRestaurantId(restaurant.id); setRestaurantPickerOpen(false); }}
                      style={[styles.dropdownItem, selectedRestaurant?.id === restaurant.id && styles.dropdownItemActive]}
                      accessibilityRole="button">
                      <View style={styles.flex}>
                        <Text style={styles.restaurantName}>{restaurant.nameEn || restaurant.nameKo}</Text>
                        <Text style={styles.mutedText}>{restaurant.nameKo}</Text>
                      </View>
                      {selectedRestaurant?.id === restaurant.id ? <Ionicons name="checkmark-circle" size={21} color={OwnerPortalColors.orange} /> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {activeContent()}
            </ScrollView>
            <View style={styles.bottomNavigation}>
              {tabs.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => changeTab(tab.key)}
                    style={styles.navItem}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={owner(tab.label)}>
                    {active ? <View style={styles.navIndicator} /> : null}
                    <Ionicons name={active ? tab.activeIcon : tab.icon} size={21} color={active ? OwnerPortalColors.orange : OwnerPortalColors.muted} />
                    <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>{owner(tab.label)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress} accessibilityRole="button">
      <View style={styles.quickActionIcon}><Ionicons name={icon} size={22} color={OwnerPortalColors.orange} /></View>
      <Text style={styles.quickActionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={OwnerPortalColors.muted} />
    </Pressable>
  );
}

function MoreRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.moreAction}>
      <Ionicons name={icon} size={20} color={OwnerPortalColors.inkSoft} />
      <Text style={styles.moreActionText}>{label}</Text>
    </View>
  );
}

function PreviewNotice({ onExit, owner }: { onExit: () => void; owner: (key: OwnerPortalTranslationKey) => string }) {
  return (
    <View style={styles.previewNotice}>
      <Ionicons name="eye-outline" size={20} color={OwnerPortalColors.orange} />
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{owner('ownerTemporaryPreviewNotOwnerAccess')}</Text>
        <Text style={styles.bodyText}>{owner('ownerYouCanInspectTheOwnerDashboardAndEditLocalSampleDraftsN85e67155')}</Text>
        <Pressable onPress={onExit} accessibilityRole="button"><Text style={styles.previewExit}>{owner('ownerExitPreview')}</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: OwnerPortalColors.canvas },
  portalLayout: { flex: 1, flexDirection: 'row' },
  mainWorkspace: { flex: 1 },
  languagePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: OwnerPortalColors.orangeSoft },
  languagePillText: { color: OwnerPortalColors.orangeDark, fontSize: 11, fontWeight: '900' },
  previewBooking: { marginHorizontal: OwnerPortalSpacing.md, padding: 14, borderRadius: 15, borderWidth: 1, borderColor: OwnerPortalColors.border, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewBookingAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: OwnerPortalColors.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  previewBookingStatus: { color: OwnerPortalColors.orangeDark, fontSize: 11, fontWeight: '800', marginTop: 4 },
  previewFootnote: { marginHorizontal: OwnerPortalSpacing.md, padding: 12, borderRadius: 12, backgroundColor: OwnerPortalColors.orangeTint, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  page: { paddingBottom: OwnerPortalSpacing.xl },
  flex: { flex: 1 },
  loading: { flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: OwnerPortalColors.canvas },
  content: { padding: OwnerPortalSpacing.md, gap: OwnerPortalSpacing.md },
  screenContent: { paddingBottom: OwnerPortalSpacing.xl, gap: OwnerPortalSpacing.md },
  brandHeader: { paddingHorizontal: OwnerPortalSpacing.md, paddingTop: 8, paddingBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandWordmark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMarkSmall: { width: 31, height: 31, borderRadius: 10, backgroundColor: OwnerPortalColors.orange, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: OwnerPortalColors.ink, fontSize: 21, fontWeight: '900', letterSpacing: 1.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ownerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: OwnerPortalColors.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  previewPill: { backgroundColor: OwnerPortalColors.orangeSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  previewPillText: { color: OwnerPortalColors.orangeDark, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  restaurantSelector: { marginHorizontal: OwnerPortalSpacing.md, marginBottom: OwnerPortalSpacing.md, backgroundColor: OwnerPortalColors.orange, borderRadius: OwnerPortalRadii.lg, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76 },
  selectorIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  selectorName: { color: '#fff', fontSize: 15, fontWeight: '800' },
  selectorSub: { color: '#fff3eb', fontSize: 11, marginTop: 3 },
  restaurantDropdown: { marginHorizontal: OwnerPortalSpacing.md, marginTop: -7, marginBottom: OwnerPortalSpacing.md, backgroundColor: '#fff', borderRadius: OwnerPortalRadii.md, borderWidth: 1, borderColor: OwnerPortalColors.border, padding: 6 },
  dropdownItem: { padding: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 10 },
  dropdownItemActive: { backgroundColor: OwnerPortalColors.orangeTint },
  screenHeading: { paddingHorizontal: OwnerPortalSpacing.md, paddingTop: 5, gap: 4 },
  pageTitle: { color: OwnerPortalColors.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.4 },
  sectionBlock: { paddingHorizontal: OwnerPortalSpacing.md, gap: 11 },
  sectionTitle: { color: OwnerPortalColors.ink, fontSize: 16, fontWeight: '800' },
  quickActions: { gap: 9 },
  quickAction: { backgroundColor: '#fff', borderRadius: OwnerPortalRadii.md, borderWidth: 1, borderColor: OwnerPortalColors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 62 },
  quickActionIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: OwnerPortalColors.orangeTint, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { color: OwnerPortalColors.ink, fontSize: 13, fontWeight: '700', flex: 1 },
  restaurantSummaryCard: { marginHorizontal: OwnerPortalSpacing.md, backgroundColor: '#fff', borderRadius: OwnerPortalRadii.lg, borderWidth: 1, borderColor: OwnerPortalColors.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  restaurantSummaryIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: OwnerPortalColors.orangeTint, alignItems: 'center', justifyContent: 'center' },
  restaurantName: { color: OwnerPortalColors.ink, fontSize: 14, fontWeight: '800' },
  activePill: { backgroundColor: '#e6f5eb', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  activePillText: { color: '#247443', fontSize: 10, fontWeight: '800' },
  accountCard: { marginHorizontal: OwnerPortalSpacing.md, padding: 15, backgroundColor: '#fff', borderRadius: OwnerPortalRadii.lg, borderWidth: 1, borderColor: OwnerPortalColors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: OwnerPortalColors.orangeTint, alignItems: 'center', justifyContent: 'center' },
  menuCard: { marginHorizontal: OwnerPortalSpacing.md, paddingHorizontal: 14, backgroundColor: '#fff', borderRadius: OwnerPortalRadii.lg, borderWidth: 1, borderColor: OwnerPortalColors.border },
  moreAction: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 },
  moreActionText: { flex: 1, color: OwnerPortalColors.ink, fontSize: 13, fontWeight: '600' },
  rowDivider: { height: 1, backgroundColor: OwnerPortalColors.divider },
  brandFooter: { alignItems: 'center', paddingVertical: 23, gap: 5 },
  brandMark: { width: 48, height: 48, borderRadius: 15, backgroundColor: OwnerPortalColors.orangeTint, alignItems: 'center', justifyContent: 'center' },
  brandFooterTitle: { color: OwnerPortalColors.ink, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  bottomNavigation: { minHeight: 67, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: OwnerPortalColors.border, flexDirection: 'row', paddingHorizontal: 4, paddingTop: 7, paddingBottom: 3 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative' },
  navLabel: { color: OwnerPortalColors.muted, fontSize: 9, fontWeight: '600' },
  navLabelActive: { color: OwnerPortalColors.orange, fontWeight: '900' },
  navIndicator: { position: 'absolute', top: -7, width: 25, height: 3, borderRadius: 2, backgroundColor: OwnerPortalColors.orange },
  previewNotice: { marginHorizontal: OwnerPortalSpacing.md, marginBottom: 12, padding: 13, borderRadius: OwnerPortalRadii.md, backgroundColor: OwnerPortalColors.orangeTint, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  previewExit: { color: OwnerPortalColors.orangeDark, fontSize: 12, fontWeight: '800', marginTop: 7 },
  applicationIntro: { alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
  emptyCard: { flex: 1, margin: 16, padding: 24, borderRadius: OwnerPortalRadii.lg, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 12 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: OwnerPortalRadii.md, gap: 12, borderWidth: 1, borderColor: OwnerPortalColors.border },
  cardTitle: { color: OwnerPortalColors.ink, fontSize: 15, fontWeight: '800' },
  bodyText: { color: OwnerPortalColors.inkSoft, fontSize: 13, lineHeight: 20 },
  mutedText: { color: OwnerPortalColors.muted, fontSize: 12, lineHeight: 18 },
  noticeCard: { backgroundColor: OwnerPortalColors.orangeTint, padding: 15, borderRadius: OwnerPortalRadii.md, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  field: { gap: 6 },
  fieldLabel: { color: OwnerPortalColors.inkSoft, fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: OwnerPortalColors.border, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: OwnerPortalColors.ink, fontSize: 14 },
  multilineInput: { minHeight: 90, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: OwnerPortalColors.orange, padding: 15, borderRadius: 11, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  disabledButton: { opacity: 0.55 },
  secondaryButton: { borderWidth: 1, borderColor: OwnerPortalColors.orange, backgroundColor: '#fff', padding: 14, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { color: OwnerPortalColors.orangeDark, fontWeight: '800' },
});
