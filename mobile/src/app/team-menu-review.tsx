import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/components/show-alert';
import { MenuReviewError, type PendingMenuPhoto } from '@/data/menu-review-repository';
import { ALL_INGREDIENTS } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/i18n/translations';
import {
  approveDraft,
  draftFromSaved,
  emptyDraftItem,
  filledRows,
  isTeamMember,
  loadPendingMenuPhotos,
  menuPhotoUrl,
  photoTitle,
  readMenuWithAi,
  rejectPhoto,
  reviewErrorKey,
  rowProblem,
  saveDraft,
  type DraftItem,
  type DraftProblem,
} from '@/logic/menu-review';
import { userMessage } from '@/logic/user-error';

// Team only (029): review the menu photos people sent with "Send menu photo" (#82).
// Pick a photo -> type the dishes or read them with AI -> Approve (dishes go live,
// tagged by the dish library) or Reject with a reason.

const PROBLEM_TEXT: Record<DraftProblem, TranslationKey> = {
  no_name: 'menuReviewProblemName',
  no_price: 'menuReviewProblemPrice',
  unknown_tag: 'menuReviewProblemTag',
};

export default function TeamMenuReviewScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<PendingMenuPhoto[] | null>(null);
  const [selected, setSelected] = useState<PendingMenuPhoto | null>(null);

  const reload = useCallback(async () => {
    try {
      setPhotos(await loadPendingMenuPhotos());
    } catch (error) {
      console.warn('Could not load menu photos:', error);
      setPhotos([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    isTeamMember().then((team) => {
      if (!active) return;
      setAllowed(team);
      if (team) void reload();
    });
    return () => {
      active = false;
    };
  }, [reload]);

  const done = async (message: string) => {
    setSelected(null);
    await reload();
    showAlert(t('menuReviewTitle'), message);
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
          {selected ? photoTitle(selected, language) : t('menuReviewTitle')}
        </Text>
      </View>

      {allowed === null ? (
        <ActivityIndicator style={styles.loading} color="#D9472B" />
      ) : !allowed ? (
        <Text style={styles.muted}>{t('menuReviewTeamOnly')}</Text>
      ) : selected ? (
        <PhotoReview key={selected.id} photo={selected} onDone={done} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>{t('menuReviewIntro')}</Text>
          {photos === null ? (
            <ActivityIndicator style={styles.loading} color="#D9472B" />
          ) : photos.length === 0 ? (
            <Text style={styles.muted}>{t('menuReviewEmpty')}</Text>
          ) : (
            photos.map((photo) => (
              <Pressable
                key={photo.id}
                testID="menu-photo-row"
                onPress={() => setSelected(photo)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.rowIcon}>
                  <Ionicons name={photo.restaurantId ? 'restaurant-outline' : 'map-outline'} size={18} color="#4A4440" />
                </View>
                <View style={styles.info}>
                  <Text style={styles.cardTitle}>{photoTitle(photo, language)}</Text>
                  <Text style={styles.sub}>
                    {t('menuReviewSentAt', { date: new Date(photo.createdAt).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-GB') })}
                  </Text>
                  {photo.note !== '' && <Text style={styles.sub}>{t('menuReviewNote', { note: photo.note })}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#857C76" />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PhotoReview({ photo, onDone }: { photo: PendingMenuPhoto; onDone: (message: string) => void }) {
  const { t, language } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>(() => {
    const saved = draftFromSaved(photo.draft);
    return saved.length > 0 ? saved : [emptyDraftItem()];
  });
  const [busy, setBusy] = useState<'ai' | 'save' | 'approve' | 'reject' | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    let active = true;
    menuPhotoUrl(photo.photoPath).then((link) => active && setUrl(link));
    return () => {
      active = false;
    };
  }, [photo.photoPath]);

  const update = (key: string, field: keyof DraftItem, value: string) =>
    setItems((rows) => rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  const readAi = async () => {
    setBusy('ai');
    try {
      const result = await readMenuWithAi(photo);
      if (result.ok) {
        setItems(result.items.length > 0 ? result.items : [emptyDraftItem()]);
        setProblems([]);
      } else {
        showAlert(t('menuReviewReadAi'), t(result.reason));
      }
    } catch (error) {
      // e.g. the photo download or the network fails: tell the reviewer instead of
      // leaving every button disabled
      console.warn('Menu review AI read failed:', error);
      showAlert(t('menuReviewReadAi'), userMessage(error, t('pleaseTryAgain'), t));
    } finally {
      setBusy(null);
    }
  };

  const fail = (error: unknown) => {
    console.warn('Menu review failed:', error);
    if (error instanceof MenuReviewError && error.problems.length > 0) setProblems(error.problems);
    showAlert(t('updateFailed'), t(reviewErrorKey(error)));
  };

  const save = async () => {
    setBusy('save');
    try {
      await saveDraft(photo, items);
      showAlert(t('menuReviewTitle'), t('menuReviewSaved'));
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  const approve = () => {
    const rows = filledRows(items);
    if (rows.length === 0) {
      showAlert(t('menuReviewApprove'), t('menuReviewNoRows'));
      return;
    }
    if (rows.some((row) => rowProblem(row) !== null)) {
      showAlert(t('menuReviewApprove'), t('menuReviewFixDraft'));
      return;
    }
    const name = photoTitle(photo, language);
    showAlert(t('menuReviewApprove'), t('menuReviewApproveConfirm', { count: rows.length, name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('menuReviewApprove'),
        onPress: async () => {
          setBusy('approve');
          try {
            const result = await approveDraft(photo, items);
            onDone(
              result.skipped.length > 0
                ? t('menuReviewApprovedSkipped', { added: result.added, skipped: result.skipped.join(', ') })
                : t('menuReviewApproved', { added: result.added }),
            );
          } catch (error) {
            fail(error);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const reject = async () => {
    setBusy('reject');
    try {
      await rejectPhoto(photo, rejectReason);
      onDone(t('menuReviewRejected'));
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  const rowCount = filledRows(items).length;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {url ? (
        <Image source={{ uri: url }} style={styles.photo} resizeMode="contain" />
      ) : (
        <View style={[styles.photo, styles.photoEmpty]}>
          <ActivityIndicator color="#D9472B" />
        </View>
      )}
      {photo.note !== '' && <Text style={styles.sub}>{t('menuReviewNote', { note: photo.note })}</Text>}
      {!photo.restaurantId && <Text style={styles.warning}>{t('menuReviewKakaoPlace')}</Text>}

      <Pressable style={[styles.secondary, busy && styles.disabled]} disabled={busy !== null} onPress={() => void readAi()}>
        {busy === 'ai' ? (
          <Text style={styles.secondaryText}>{t('menuReviewReading')}</Text>
        ) : (
          <Text style={styles.secondaryText}>✨ {t('menuReviewReadAi')}</Text>
        )}
      </Pressable>

      <Text style={styles.section}>{t('menuReviewDishes', { count: rowCount })}</Text>
      <Text style={styles.sub}>{t('menuReviewTagsHelp', { tags: ALL_INGREDIENTS.join(', ') })}</Text>

      {items.map((item) => {
        const problem = filledRows([item]).length > 0 ? rowProblem(item) : null;
        return (
          <View key={item.key} style={styles.row} testID="draft-row">
            <View style={styles.rowTop}>
              <TextInput
                style={[styles.input, styles.flex]}
                value={item.nameKo}
                onChangeText={(v) => update(item.key, 'nameKo', v)}
                placeholder={t('menuReviewNameKo')}
                placeholderTextColor="#A39A94"
              />
              <TextInput
                style={[styles.input, styles.price]}
                value={item.price}
                onChangeText={(v) => update(item.key, 'price', v)}
                placeholder={t('menuReviewPrice')}
                placeholderTextColor="#A39A94"
                keyboardType="number-pad"
              />
            </View>
            <TextInput
              style={styles.input}
              value={item.nameEn}
              onChangeText={(v) => update(item.key, 'nameEn', v)}
              placeholder={t('menuReviewNameEn')}
              placeholderTextColor="#A39A94"
            />
            <TextInput
              style={styles.input}
              value={item.contains}
              onChangeText={(v) => update(item.key, 'contains', v)}
              placeholder={t('menuReviewContains')}
              placeholderTextColor="#A39A94"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={item.mayContain}
              onChangeText={(v) => update(item.key, 'mayContain', v)}
              placeholder={t('menuReviewMayContain')}
              placeholderTextColor="#A39A94"
              autoCapitalize="none"
            />
            <View style={styles.rowBottom}>
              {problem ? <Text style={styles.problem}>{t(PROBLEM_TEXT[problem])}</Text> : <View />}
              <Pressable onPress={() => setItems((rows) => rows.filter((r) => r.key !== item.key))} hitSlop={8}>
                <Text style={styles.remove}>{t('menuReviewRemoveRow')}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable style={styles.addRow} onPress={() => setItems((rows) => [...rows, emptyDraftItem()])}>
        <Ionicons name="add" size={18} color="#D9472B" />
        <Text style={styles.addRowText}>{t('menuReviewAddRow')}</Text>
      </Pressable>

      {problems.length > 0 && (
        <View style={styles.problemBox}>
          <Text style={styles.problem}>{t('menuReviewFixDraft')}</Text>
          {problems.map((p) => (
            <Text key={p} style={styles.problem}>
              • {p}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable style={[styles.secondary, styles.flex, busy && styles.disabled]} disabled={busy !== null} onPress={() => void save()}>
          <Text style={styles.secondaryText}>{t('menuReviewSave')}</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, styles.flex, (busy || !photo.restaurantId) && styles.disabled]}
          disabled={busy !== null || !photo.restaurantId}
          onPress={approve}>
          {busy === 'approve' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t('menuReviewApprove')}</Text>}
        </Pressable>
      </View>

      <View style={styles.rejectBox}>
        <TextInput
          style={styles.input}
          value={rejectReason}
          onChangeText={setRejectReason}
          placeholder={t('menuReviewRejectReason')}
          placeholderTextColor="#A39A94"
          maxLength={300}
        />
        <Pressable style={[styles.danger, busy && styles.disabled]} disabled={busy !== null} onPress={() => void reject()}>
          <Text style={styles.dangerText}>{t('menuReviewReject')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCF8F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { flex: 1, color: '#1E1E1E', fontSize: 22, fontWeight: '900' },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  intro: { color: '#4A4440', lineHeight: 20 },
  muted: { color: '#857C76', padding: 16 },
  loading: { marginTop: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EFE7E1',
  },
  pressed: { opacity: 0.7 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4EEE9', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  cardTitle: { color: '#1E1E1E', fontWeight: '700', fontSize: 15 },
  sub: { color: '#857C76', fontSize: 13 },
  warning: { color: '#A66500', fontWeight: '700' },
  photo: { width: '100%', height: 320, borderRadius: 12, backgroundColor: '#EFE7E1' },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  section: { color: '#1E1E1E', fontSize: 17, fontWeight: '800', marginTop: 4 },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 10, gap: 6, borderWidth: 1, borderColor: '#EFE7E1' },
  rowTop: { flexDirection: 'row', gap: 6 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flex: { flex: 1 },
  price: { width: 110 },
  input: {
    borderWidth: 1,
    borderColor: '#E3DAD3',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#1E1E1E',
    backgroundColor: '#FFFDFB',
  },
  problem: { color: '#C62828', fontSize: 13 },
  problemBox: { backgroundColor: '#FDECEA', borderRadius: 10, padding: 10, gap: 2 },
  remove: { color: '#857C76', fontSize: 13, textDecorationLine: 'underline' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', padding: 6 },
  addRowText: { color: '#D9472B', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  primary: { backgroundColor: '#D9472B', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondary: { borderWidth: 1, borderColor: '#D9472B', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  secondaryText: { color: '#D9472B', fontWeight: '800' },
  danger: { borderWidth: 1, borderColor: '#C62828', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  dangerText: { color: '#C62828', fontWeight: '800' },
  rejectBox: { gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EFE7E1' },
  disabled: { opacity: 0.5 },
});
