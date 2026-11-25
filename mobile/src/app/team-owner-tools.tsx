import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { setAppMode } from '@/data/app-mode';
import type { PendingOwnerApplication, TeamOwnerAccess } from '@/data/team-owner-repository';
import type { Restaurant } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import { isTeamMember } from '@/logic/menu-review';
import { findRestaurantsMatching } from '@/logic/restaurant-service';
import {
  applicationTitle,
  approvalTarget,
  closeAsOwner,
  decideOwnerApplication,
  loadMyTeamOwnerAccess,
  loadPendingOwnerApplications,
  openAsOwner,
  ownerDocumentUrl,
  reviewProblem,
  teamOwnerErrorKey,
} from '@/logic/team-owner-tools';

// Team only (#118, SQL 043):
// 1. Owner applications: check the business details and documents, then approve
//    (the applicant becomes the restaurant's owner) or reject with a reason.
// 2. Open any restaurant as owner, to test the Owner Portal or answer bookings.
//    These links are marked "via team" in the database and can be closed again.

const BROWN = '#4A4440';
const ACCENT = '#D9472B';

export default function TeamOwnerToolsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [applications, setApplications] = useState<PendingOwnerApplication[] | null>(null);
  const [selected, setSelected] = useState<PendingOwnerApplication | null>(null);
  const [access, setAccess] = useState<TeamOwnerAccess[] | null>(null);

  const reload = useCallback(async () => {
    const [applicationResult, accessResult] = await Promise.allSettled([
      loadPendingOwnerApplications(),
      loadMyTeamOwnerAccess(),
    ]);
    setApplications(applicationResult.status === 'fulfilled' ? applicationResult.value : []);
    setAccess(accessResult.status === 'fulfilled' ? accessResult.value : []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const team = await isTeamMember();
      if (!active) return;
      setAllowed(team);
      if (team) await reload();
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  const decided = async () => {
    setSelected(null);
    await reload();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (selected ? setSelected(null) : router.back())}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('back')}>
          <Ionicons name="chevron-back" size={26} color="#1E1E1E" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {selected ? applicationTitle(selected) : t('teamOwnerTitle')}
        </Text>
      </View>

      {allowed === null ? (
        <ActivityIndicator style={styles.loading} color={ACCENT} />
      ) : !allowed ? (
        <Text style={styles.muted}>{t('teamOwnerTeamOnly')}</Text>
      ) : selected ? (
        <ApplicationReview key={selected.id} application={selected} onDone={decided} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>{t('teamOwnerApplications')}</Text>
          <Text style={styles.intro}>{t('teamOwnerApplicationsIntro')}</Text>
          {applications === null ? (
            <ActivityIndicator style={styles.loading} color={ACCENT} />
          ) : applications.length === 0 ? (
            <Text style={styles.muted}>{t('teamOwnerNoApplications')}</Text>
          ) : (
            applications.map((application) => (
              <Pressable
                key={application.id}
                onPress={() => setSelected(application)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{applicationTitle(application)}</Text>
                  <Text style={styles.cardSub}>
                    {t(application.applicationType === 'claim' ? 'teamOwnerTypeClaim' : 'teamOwnerTypeNew')}
                    {' · '}
                    {application.business.registeredBusinessName}
                  </Text>
                  <Text style={styles.cardSub}>
                    {t('teamOwnerDocumentCount', { count: application.documents.length })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#857C76" />
              </Pressable>
            ))
          )}

          <OwnerAccessSection access={access} onChanged={reload} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------- one application ----------

function ApplicationReview({
  application,
  onDone,
}: {
  application: PendingOwnerApplication;
  onDone: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [picked, setPicked] = useState<Restaurant | null>(null);
  const [busy, setBusy] = useState(false);
  const business = application.business;
  const isNew = application.applicationType === 'new';

  const openDocument = async (storagePath: string) => {
    try {
      await Linking.openURL(await ownerDocumentUrl(storagePath));
    } catch (error) {
      showAlert(t('teamOwnerTitle'), t(teamOwnerErrorKey(error)));
    }
  };

  const decide = (approve: boolean) => {
    const target = approvalTarget(application, picked?.id ?? null);
    const problem = reviewProblem(application, approve, message, target);
    if (problem) {
      showAlert(t('teamOwnerTitle'), t(teamOwnerErrorKey(problem)));
      return;
    }
    const run = async () => {
      setBusy(true);
      try {
        await decideOwnerApplication(application, approve, message, picked?.id ?? null);
        showAlert(t('teamOwnerTitle'), t(approve ? 'teamOwnerApproved' : 'teamOwnerRejected'));
        await onDone();
      } catch (error) {
        showAlert(t('teamOwnerTitle'), t(teamOwnerErrorKey(error)));
      } finally {
        setBusy(false);
      }
    };
    showAlert(t(approve ? 'teamOwnerApprove' : 'teamOwnerReject'), t(approve ? 'teamOwnerApproveConfirm' : 'teamOwnerRejectConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t(approve ? 'teamOwnerApprove' : 'teamOwnerReject'), style: approve ? 'default' : 'destructive', onPress: () => void run() },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.section}>{t('teamOwnerRestaurant')}</Text>
      <View style={styles.box}>
        <Text style={styles.badgeLine}>
          {t(isNew ? 'teamOwnerTypeNew' : 'teamOwnerTypeClaim')}
        </Text>
        {isNew ? (
          <>
            <Row label={t('teamOwnerNameKo')} value={application.restaurantNameKo} />
            <Row label={t('teamOwnerNameEn')} value={application.restaurantNameEn} />
            <Row label={t('teamOwnerCategory')} value={application.category} />
            <Row label={t('teamOwnerAddress')} value={application.address} />
            <Row label={t('teamOwnerPhone')} value={application.phone} />
            <Row label={t('teamOwnerDescription')} value={application.description} />
          </>
        ) : (
          <>
            <Row label={t('teamOwnerNameKo')} value={application.existingRestaurantNameKo} />
            <Row label={t('teamOwnerAddress')} value={application.existingRestaurantAddress} />
          </>
        )}
      </View>

      <Text style={styles.section}>{t('teamOwnerBusiness')}</Text>
      <View style={styles.box}>
        <Row label={t('teamOwnerBusinessName')} value={business.registeredBusinessName} />
        <Row label={t('teamOwnerRegistrationNumber')} value={business.businessRegistrationNumber} />
        <Row label={t('teamOwnerRepresentative')} value={business.legalRepresentativeName} />
        <Row label={t('teamOwnerAddress')} value={business.registeredAddress} />
        <Row label={t('teamOwnerPhone')} value={business.businessContactPhone} />
        <Row label={t('teamOwnerApplicant')} value={`${business.applicantFullName} · ${business.applicantPhone}`} />
        <Row label={t('teamOwnerEmail')} value={business.applicantEmail} />
      </View>

      <Text style={styles.section}>{t('teamOwnerDocuments')}</Text>
      {application.documents.length === 0 ? (
        <Text style={styles.muted}>{t('teamOwnerNoDocuments')}</Text>
      ) : (
        application.documents.map((document) => (
          <Pressable
            key={document.id}
            onPress={() => void openDocument(document.storagePath)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <Ionicons name="document-text-outline" size={20} color={BROWN} />
            <Text style={[styles.flex, styles.cardTitle]} numberOfLines={1}>
              {document.originalFilename}
            </Text>
            <Ionicons name="open-outline" size={18} color="#857C76" />
          </Pressable>
        ))
      )}

      {isNew && (
        <>
          <Text style={styles.section}>{t('teamOwnerLinkListing')}</Text>
          <Text style={styles.intro}>{t('teamOwnerLinkListingIntro')}</Text>
          <RestaurantPicker picked={picked} onPick={setPicked} />
        </>
      )}

      <Text style={styles.section}>{t('teamOwnerMessage')}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={message}
        onChangeText={setMessage}
        placeholder={t('teamOwnerMessagePlaceholder')}
        placeholderTextColor="#A79E98"
        multiline
        maxLength={500}
      />

      <View style={styles.actions}>
        <Pressable
          onPress={() => decide(false)}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, styles.rejectButton, (pressed || busy) && styles.pressed]}>
          <Text style={styles.rejectText}>{t('teamOwnerReject')}</Text>
        </Pressable>
        <Pressable
          onPress={() => decide(true)}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, styles.approveButton, (pressed || busy) && styles.pressed]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.approveText}>{t('teamOwnerApprove')}</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// ---------- search our restaurants (used for "new" applications and "open as owner") ----------

function RestaurantPicker({
  picked,
  onPick,
  actionLabel,
}: {
  picked: Restaurant | null;
  onPick: (restaurant: Restaurant | null) => void;
  actionLabel?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Restaurant[] | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults((await findRestaurantsMatching(query)).slice(0, 20));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (picked && !actionLabel) {
    return (
      <View style={[styles.card, styles.pickedCard]}>
        <Ionicons name="checkmark-circle" size={20} color="#23845D" />
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{picked.nameKo}</Text>
          <Text style={styles.cardSub}>{picked.address}</Text>
        </View>
        <Pressable onPress={() => onPick(null)} hitSlop={10} accessibilityRole="button">
          <Text style={styles.link}>{t('teamOwnerChange')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.pickerWrap}>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, styles.flex]}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void search()}
          placeholder={t('teamOwnerSearchPlaceholder')}
          placeholderTextColor="#A79E98"
          returnKeyType="search"
        />
        <Pressable
          onPress={() => void search()}
          accessibilityRole="button"
          accessibilityLabel={t('teamOwnerSearch')}
          style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}>
          {searching ? <ActivityIndicator color="#fff" /> : <Ionicons name="search" size={18} color="#fff" />}
        </Pressable>
      </View>
      {results !== null && results.length === 0 && <Text style={styles.muted}>{t('teamOwnerNoResults')}</Text>}
      {results?.map((restaurant) => (
        <Pressable
          key={restaurant.id}
          onPress={() => onPick(restaurant)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{restaurant.nameKo}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>{restaurant.address}</Text>
          </View>
          <Text style={styles.link}>{actionLabel ?? t('teamOwnerPick')}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------- open any restaurant as owner ----------

function OwnerAccessSection({
  access,
  onChanged,
}: {
  access: TeamOwnerAccess[] | null;
  onChanged: () => Promise<void>;
}) {
  const router = useRouter();
  const { t } = useTranslation();

  const open = async (restaurant: Restaurant | null) => {
    if (!restaurant) return;
    try {
      await openAsOwner(restaurant.id);
      await onChanged();
      showAlert(t('teamOwnerAccessTitle'), t('teamOwnerOpened', { name: restaurant.nameKo }));
    } catch (error) {
      showAlert(t('teamOwnerAccessTitle'), t(teamOwnerErrorKey(error)));
    }
  };

  const close = async (restaurantId: string) => {
    try {
      await closeAsOwner(restaurantId);
      await onChanged();
    } catch (error) {
      showAlert(t('teamOwnerAccessTitle'), t(teamOwnerErrorKey(error)));
    }
  };

  const goToPortal = async () => {
    await setAppMode('business');
    router.replace('/owner');
  };

  return (
    <>
      <Text style={[styles.section, styles.sectionGap]}>{t('teamOwnerAccessTitle')}</Text>
      <Text style={styles.intro}>{t('teamOwnerAccessIntro')}</Text>
      <RestaurantPicker picked={null} onPick={(restaurant) => void open(restaurant)} actionLabel={t('teamOwnerOpen')} />

      {access === null ? (
        <ActivityIndicator style={styles.loading} color={ACCENT} />
      ) : access.length > 0 ? (
        <>
          <Text style={styles.subSection}>{t('teamOwnerOpenNow')}</Text>
          {access.map((item) => (
            <View key={item.restaurantId} style={styles.card}>
              <Ionicons name="key-outline" size={18} color={BROWN} />
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{item.nameKo}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>{item.address}</Text>
              </View>
              <Pressable onPress={() => void close(item.restaurantId)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.closeText}>{t('teamOwnerClose')}</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => void goToPortal()}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.approveButton, pressed && styles.pressed]}>
            <Ionicons name="grid-outline" size={18} color="#fff" />
            <Text style={styles.approveText}>{t('teamOwnerGoToPortal')}</Text>
          </Pressable>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCF8F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  title: { flex: 1, color: '#1E1E1E', fontSize: 20, fontWeight: '800' },
  loading: { marginTop: 24 },
  content: { padding: 16, paddingBottom: 48, gap: 10 },
  section: { color: '#1E1E1E', fontSize: 16, fontWeight: '800', marginTop: 8 },
  sectionGap: { marginTop: 24 },
  subSection: { color: '#6B6460', fontSize: 13, fontWeight: '700', marginTop: 8 },
  intro: { color: '#6B6460', fontSize: 13, lineHeight: 18 },
  muted: { color: '#857C76', fontSize: 14, padding: 16, textAlign: 'center' },
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EFE7E1',
  },
  pickedCard: { borderColor: '#23845D' },
  pressed: { opacity: 0.7 },
  cardTitle: { color: '#1E1E1E', fontSize: 15, fontWeight: '700' },
  cardSub: { color: '#857C76', fontSize: 13, marginTop: 2 },
  box: { padding: 14, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EFE7E1', gap: 8 },
  badgeLine: { color: ACCENT, fontSize: 12, fontWeight: '800' },
  row: { gap: 2 },
  rowLabel: { color: '#857C76', fontSize: 12 },
  rowValue: { color: '#1E1E1E', fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#E3D9D2',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1E1E1E',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  pickerWrap: { gap: 8 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchButton: { width: 46, borderRadius: 12, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' },
  link: { color: ACCENT, fontSize: 14, fontWeight: '700' },
  closeText: { color: '#857C76', fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  approveButton: { backgroundColor: ACCENT },
  rejectButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3D9D2' },
  approveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  rejectText: { color: '#1E1E1E', fontSize: 15, fontWeight: '800' },
});
