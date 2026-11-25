import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DishFitPill } from '@/components/booking-parts';
import { DishWhySheet } from '@/components/dish-why-sheet';
import { showAlert } from '@/components/show-alert';
import { scanMenuPhoto, type ScanError } from '@/data/menu-scan-repository';
import type { Dish, Restaurant } from '@/data/types';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/i18n/translations';
import {
  countByStatus,
  scanImageFrom,
  scanRestaurant,
  scanRows,
  type ScanImageProblem,
} from '@/logic/menu-scan';
import { findRestaurant } from '@/logic/restaurant-service';

const BLUE = '#1B5FAD';

// #10 part 2: Menu Scanner.
// Photo of a menu -> scan-menu reads the dishes and likely ingredients ->
// the app's own dishStatus marks each dish Safe / Ask first / Avoid for this user,
// and every Ask first dish gets a Korean question for the staff.
// Opened from Home (unknown place) or from a restaurant page (?restaurantId=...).

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.5, // menus are text: this keeps most phone photos under Claude's 5 MB limit
  base64: true,
  allowsEditing: false,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible, // iPhone: JPEG, not HEIC
};

const ERROR_KEY: Record<ScanError | ScanImageProblem, TranslationKey> = {
  not_configured: 'scanMenuErrorNotConfigured',
  not_menu: 'scanMenuErrorNotMenu',
  too_big: 'scanMenuErrorTooBig',
  bad_type: 'scanMenuErrorBadType',
  no_data: 'scanMenuErrorFailed',
  failed: 'scanMenuErrorFailed',
};

type ScanState =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'error'; key: TranslationKey }
  | { kind: 'done'; scanId: string; dishes: Dish[] };

export default function ScanMenuScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useProfile();

  const [place, setPlace] = useState<Restaurant | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanState>({ kind: 'idle' });
  const [whyDish, setWhyDish] = useState<Dish | null>(null);

  // Scanned at a restaurant: its halal certificate and 원산지 lines still count.
  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    findRestaurant(restaurantId)
      .then((found) => {
        if (active) setPlace(found ?? null);
      })
      .catch(() => {
        if (active) setPlace(null);
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const restaurant = useMemo(
    () => (scan.kind === 'done' ? scanRestaurant(scan.scanId, scan.dishes, place) : null),
    [scan, place],
  );
  const rows = restaurant ? scanRows(restaurant, profile) : [];
  const counts = countByStatus(rows);
  const reading = scan.kind === 'reading';
  const profileEmpty = profile.diets.length === 0 && profile.allergens.length === 0;

  const read = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setWhyDish(null);

    const image = scanImageFrom({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType });
    if (typeof image === 'string') {
      setScan({ kind: 'error', key: ERROR_KEY[image] });
      return;
    }

    setScan({ kind: 'reading' });
    const scanId = `scan-${Date.now()}`;
    const answer = await scanMenuPhoto(image, scanId);
    setScan(answer.ok ? { kind: 'done', scanId, dishes: answer.dishes } : { kind: 'error', key: ERROR_KEY[answer.error] });
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert(t('menuPhotoCameraNeededTitle'), t('menuPhotoCameraNeededBody'));
      return;
    }
    await read(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  };

  const choosePhoto = async () => {
    await read(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          hitSlop={8}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E1E1E" />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.title}>{t('scanMenuTitle')}</Text>
          {place && <Text style={styles.muted}>{t('scanMenuAt', { name: place.nameKo })}</Text>}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>{t('scanMenuIntro')}</Text>

        {profileEmpty && (
          <Pressable style={styles.notice} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.noticeText}>{t('scanMenuNoProfile')}</Text>
            <Text style={styles.link}>{t('edit')}</Text>
          </Pressable>
        )}

        <View style={styles.buttonRow}>
          {/* The camera can't be opened from a web browser, so the web only offers "Choose". */}
          {Platform.OS !== 'web' && (
            <Pressable
              style={[styles.button, reading && styles.disabled]}
              onPress={() => void takePhoto()}
              disabled={reading}>
              <Ionicons name="camera" size={17} color="#fff" />
              <Text style={styles.buttonText}>{t('menuPhotoTake')}</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.button, styles.secondary, reading && styles.disabled]}
            onPress={() => void choosePhoto()}
            disabled={reading}>
            <Ionicons name="images-outline" size={17} color={BLUE} />
            <Text style={styles.secondaryText}>{t('menuPhotoChoose')}</Text>
          </Pressable>
        </View>

        {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />}

        {reading && (
          <View style={styles.reading}>
            <ActivityIndicator color={BLUE} />
            <Text style={styles.muted}>{t('scanMenuReading')}</Text>
          </View>
        )}

        {scan.kind === 'error' && <Text style={styles.error}>{t(scan.key)}</Text>}

        {scan.kind === 'done' && (
          <>
            <View style={styles.warning}>
              <Ionicons name="sparkles-outline" size={16} color="#8A5300" />
              <Text style={styles.warningText}>{t('scanMenuWarning')}</Text>
            </View>

            <Text style={styles.summary}>
              {t('scanMenuSummary', { safe: counts.safe, ask: counts.ask_first, avoid: counts.avoid })}
            </Text>

            {rows.map(({ dish, status, question }) => (
              <View key={dish.id} style={styles.dish}>
                <View style={styles.dishTop}>
                  <View style={styles.flex}>
                    <Text style={styles.dishName}>
                      {dish.nameKo}
                      {dish.priceWon > 0 ? ` · ₩${dish.priceWon.toLocaleString()}` : ''}
                    </Text>
                    {dish.nameEn !== '' && dish.nameEn !== dish.nameKo && (
                      <Text style={styles.muted}>{dish.nameEn}</Text>
                    )}
                  </View>
                  <DishFitPill status={status} />
                </View>

                {question && (
                  <View style={styles.question}>
                    <Text style={styles.questionLabel}>{t('whyAskStaff')}</Text>
                    <Text style={styles.questionKo}>{question.ko}</Text>
                    {question.rom ? <Text style={styles.muted}>{question.rom}</Text> : null}
                    {question.en !== '' && <Text style={styles.muted}>{question.en}</Text>}
                  </View>
                )}

                {status !== 'safe' && (
                  <Pressable onPress={() => setWhyDish(dish)} hitSlop={8} style={styles.whyButton}>
                    <Text style={styles.link}>{t('whyButton')}</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {restaurant && (
        <DishWhySheet dish={whyDish} restaurant={restaurant} profile={profile} onClose={() => setWhyDish(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCF8F5' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48, paddingHorizontal: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#1E1E1E', fontSize: 20, fontWeight: '700' },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  body: { color: '#1E1E1E', fontSize: 14, lineHeight: 20 },
  muted: { color: '#6B6460', fontSize: 13 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF4E5',
  },
  noticeText: { flex: 1, color: '#8A5300', fontSize: 13, lineHeight: 18 },
  link: { color: BLUE, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: BLUE,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: BLUE },
  secondaryText: { color: BLUE, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  preview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#EEF2F7' },
  reading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: { color: '#B3402A', fontSize: 14, lineHeight: 20 },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF4E5',
  },
  warningText: { flex: 1, color: '#8A5300', fontSize: 13, lineHeight: 18 },
  summary: { color: '#1E1E1E', fontSize: 15, fontWeight: '700' },
  dish: {
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE7E1',
    backgroundColor: '#FFFFFF',
  },
  dishTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dishName: { color: '#1E1E1E', fontSize: 16, fontWeight: '700' },
  question: { gap: 2, padding: 10, borderRadius: 10, backgroundColor: '#F4F8FD' },
  questionLabel: { color: BLUE, fontSize: 12, fontWeight: '700' },
  questionKo: { color: '#1E1E1E', fontSize: 17, fontWeight: '700' },
  whyButton: { alignSelf: 'flex-start' },
});
