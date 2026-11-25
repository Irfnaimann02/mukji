import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { showAlert } from '@/components/show-alert';
import type { Restaurant } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import {
  deleteOwnerRestaurantPhoto,
  loadOwnerRestaurantManagement,
  saveOwnerRestaurantManagement,
  uploadOwnerRestaurantPhoto,
} from '@/data/owner-restaurant-management-repository';
import {
  OPENING_DAYS,
  RESTAURANT_PHOTO_MAX_COUNT,
  RESTAURANT_PHOTO_MAX_BYTES,
  splitFacilityText,
  validateRestaurantManagementProfile,
  type OpeningDayKey,
  type RestaurantManagementProfile,
  type RestaurantPhoto,
} from '@/logic/owner-restaurant-management';
import { userMessage } from '@/logic/user-error';
import { OwnerPortalColors } from '@/constants/owner-portal-theme';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.8,
  allowsEditing: false,
  allowsMultipleSelection: true,
};

const DAY_LABELS: Record<OpeningDayKey, 'ownerMonday' | 'ownerTuesday' | 'ownerWednesday' | 'ownerThursday' | 'ownerFriday' | 'ownerSaturday' | 'ownerSunday'> = {
  mon: 'ownerMonday',
  tue: 'ownerTuesday',
  wed: 'ownerWednesday',
  thu: 'ownerThursday',
  fri: 'ownerFriday',
  sat: 'ownerSaturday',
  sun: 'ownerSunday',
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'phone-pad' | 'url';
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
        autoCorrect={false}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}



export function OwnerRestaurantManagement({
  restaurant,
  previewMode = false,
}: {
  restaurant: Restaurant | undefined;
  previewMode?: boolean;
}) {
  const { owner } = useTranslation();
  const [profile, setProfile] = useState<RestaurantManagementProfile | null>(null);
  const [photos, setPhotos] = useState<RestaurantPhoto[]>([]);
  const [facilityText, setFacilityText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingPhotoId, setRemovingPhotoId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!restaurant) {
        setProfile(null);
        setPhotos([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const result = await loadOwnerRestaurantManagement(restaurant.id);
        if (!active) return;
        setProfile(result.profile);
        setFacilityText(result.profile.facilities.join(', '));
        setPhotos(result.photos);
      } catch (loadError) {
        if (!active) return;
        setError(userMessage(loadError, owner('ownerRestaurantManagementLoadFailed')));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [restaurant, previewMode, owner]);

  const validationError = useMemo(
    () => profile ? validateRestaurantManagementProfile({ ...profile, facilities: splitFacilityText(facilityText) }) : null,
    [profile, facilityText],
  );

  function update<K extends keyof RestaurantManagementProfile>(key: K, value: RestaurantManagementProfile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  }

  function updateHours(day: OpeningDayKey, field: 'open' | 'close', value: string) {
    setProfile((current) => {
      if (!current) return current;
      const previous = current.openingHours[day] ?? { open: '', close: '' };
      return {
        ...current,
        openingHours: { ...current.openingHours, [day]: { ...previous, [field]: value } },
      };
    });
  }

  function toggleClosedDay(day: OpeningDayKey) {
    setProfile((current) => {
      if (!current) return current;
      const closedDays = current.closedDays.includes(day)
        ? current.closedDays.filter((item) => item !== day)
        : [...current.closedDays, day];
      return { ...current, closedDays };
    });
  }

  async function save() {
    if (!profile || previewMode || saving) return;
    const candidate = { ...profile, facilities: splitFacilityText(facilityText) };
    const issue = validateRestaurantManagementProfile(candidate);
    if (issue) {
      const messages: Record<typeof issue, string> = {
        nameKo: owner('ownerRestaurantNameKoInvalid'),
        nameEn: owner('ownerRestaurantNameEnInvalid'),
        category: owner('ownerRestaurantCategoryInvalid'),
        address: owner('ownerRestaurantAddressInvalid'),
        phone: owner('ownerRestaurantPhoneInvalid'),
        latitude: owner('ownerRestaurantLatitudeInvalid'),
        longitude: owner('ownerRestaurantLongitudeInvalid'),
        description: owner('ownerRestaurantDescriptionInvalid'),
        reservationUrl: owner('ownerRestaurantReservationUrlInvalid'),
        openingHours: owner('ownerRestaurantHoursInvalid'),
        closedDays: owner('ownerRestaurantClosedDaysInvalid'),
        facilities: owner('ownerRestaurantFacilitiesInvalid'),
      };
      showAlert(owner('ownerCheckRestaurantInformation'), messages[issue]);
      return;
    }

    setSaving(true);
    try {
      await saveOwnerRestaurantManagement(candidate);
      setProfile(candidate);
      showAlert(owner('ownerRestaurantInformationSaved'), owner('ownerRestaurantInformationSavedMessage'));
    } catch (saveError) {
      showAlert(owner('ownerRestaurantInformationSaveFailed'), userMessage(saveError, owner('ownerPleaseTryAgain')));
    } finally {
      setSaving(false);
    }
  }

  async function addPhotos() {
    if (!restaurant || previewMode || uploading) return;
    const remaining = RESTAURANT_PHOTO_MAX_COUNT - photos.length;
    if (remaining <= 0) {
      showAlert(owner('ownerRestaurantPhotoLimitTitle'), owner('ownerRestaurantPhotoLimitMessage'));
      return;
    }

    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        ...PICKER_OPTIONS,
        selectionLimit: remaining,
      });
      if (result.canceled || !result.assets?.length) return;

      const added: RestaurantPhoto[] = [];
      const failures: string[] = [];
      for (const asset of result.assets.slice(0, remaining)) {
        if (asset.fileSize && asset.fileSize > RESTAURANT_PHOTO_MAX_BYTES) {
          failures.push(owner('ownerRestaurantPhotoTooLarge'));
          continue;
        }
        try {
          const photo = await uploadOwnerRestaurantPhoto({
            restaurantId: restaurant.id,
            uri: asset.uri,
            mimeType: asset.mimeType ?? undefined,
            filename: asset.fileName,
            altText: `${profile?.nameEn ?? restaurant.nameEn} restaurant photo`,
          });
          added.push(photo);
        } catch (photoError) {
          failures.push(userMessage(photoError, owner('ownerPleaseTryAgain')));
        }
      }
      if (added.length) setPhotos((current) => [...current, ...added]);
      if (failures.length) {
        showAlert(owner('ownerRestaurantPhotoUploadFailed'), failures.slice(0, 3).join('\n'));
      }
    } catch (uploadError) {
      showAlert(owner('ownerRestaurantPhotoUploadFailed'), userMessage(uploadError, owner('ownerPleaseTryAgain')));
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(photo: RestaurantPhoto) {
    if (!restaurant || previewMode || removingPhotoId) return;
    showAlert(owner('ownerRemoveRestaurantPhoto'), owner('ownerRemoveRestaurantPhotoConfirm'), [
      { text: owner('ownerCancel'), style: 'cancel' },
      {
        text: owner('ownerRemove'),
        style: 'destructive',
        onPress: () => {
          setRemovingPhotoId(photo.id);
          void deleteOwnerRestaurantPhoto(restaurant.id, photo.id)
            .then(() => setPhotos((current) => current.filter((item) => item.id !== photo.id)))
            .catch((removeError) => showAlert(owner('ownerRestaurantPhotoRemoveFailed'), userMessage(removeError, owner('ownerPleaseTryAgain'))))
            .finally(() => setRemovingPhotoId(''));
        },
      },
    ]);
  }

  if (!restaurant) return null;
  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={OwnerPortalColors.orange} /><Text style={styles.muted}>{owner('ownerLoadingRestaurantInformation')}</Text></View>;
  }
  if (error) {
    return <View style={styles.card}><Ionicons name="alert-circle-outline" size={24} color="#b3261e" /><Text style={styles.title}>{owner('ownerRestaurantManagementLoadFailed')}</Text><Text style={styles.body}>{error}</Text></View>;
  }
  if (!profile) return null;

  return (
    <View style={styles.root}>
      {previewMode ? (
        <View style={styles.notice}><Ionicons name="eye-outline" size={21} color={OwnerPortalColors.orange} /><Text style={styles.body}>{owner('ownerRestaurantManagementPreviewNote')}</Text></View>
      ) : (
        <View style={styles.notice}><Ionicons name="cloud-done-outline" size={21} color={OwnerPortalColors.orange} /><Text style={styles.body}>{owner('ownerRestaurantManagementSavedToMukjiNote')}</Text></View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{owner('ownerRestaurantBasicInformation')}</Text>
        <Field label={owner('ownerRestaurantNameKorean')} value={profile.nameKo} onChangeText={(value) => update('nameKo', value)} maxLength={160} />
        <Field label={owner('ownerRestaurantNameEnglish')} value={profile.nameEn} onChangeText={(value) => update('nameEn', value)} maxLength={160} />
        <Field label={owner('ownerRestaurantCategory')} value={profile.category} onChangeText={(value) => update('category', value)} maxLength={80} />
        <Field label={owner('ownerAddress2')} value={profile.address} onChangeText={(value) => update('address', value)} multiline maxLength={500} />
        <Field label={owner('ownerPhoneNumber')} value={profile.phone} onChangeText={(value) => update('phone', value)} keyboardType="phone-pad" maxLength={30} />
        <Field label={owner('ownerRestaurantDescription')} value={profile.description} onChangeText={(value) => update('description', value)} multiline maxLength={2000} placeholder={owner('ownerRestaurantDescriptionHint')} />
        <Field label={owner('ownerRestaurantReservationUrl')} value={profile.reservationUrl} onChangeText={(value) => update('reservationUrl', value)} keyboardType="url" maxLength={500} placeholder="https://" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{owner('ownerRestaurantMapLocation')}</Text>
        <Text style={styles.body}>{owner('ownerRestaurantMapLocationHint')}</Text>
        <View style={styles.row}>
          <View style={styles.flex}><Field label={owner('ownerLatitude')} value={profile.latitude} onChangeText={(value) => update('latitude', value)} keyboardType="decimal-pad" /></View>
          <View style={styles.flex}><Field label={owner('ownerLongitude')} value={profile.longitude} onChangeText={(value) => update('longitude', value)} keyboardType="decimal-pad" /></View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{owner('ownerRestaurantOpeningHours')}</Text>
        <Text style={styles.body}>{owner('ownerRestaurantOpeningHoursHint')}</Text>
        {OPENING_DAYS.map((day) => {
          const hours = profile.openingHours[day.key] ?? { open: '', close: '' };
          const closed = profile.closedDays.includes(day.key);
          return (
            <View key={day.key} style={styles.dayRow}>
              <View style={styles.dayHeading}>
                <Text style={styles.dayName}>{owner(DAY_LABELS[day.key])}</Text>
                <Pressable onPress={() => toggleClosedDay(day.key)} style={[styles.closedToggle, closed && styles.closedToggleActive]} accessibilityRole="checkbox" accessibilityState={{ checked: closed }}>
                  <Ionicons name={closed ? 'checkbox' : 'square-outline'} size={18} color={closed ? OwnerPortalColors.orange : OwnerPortalColors.muted} />
                  <Text style={[styles.closedText, closed && styles.closedTextActive]}>{owner('ownerClosed')}</Text>
                </Pressable>
              </View>
              <View style={styles.row}>
                <View style={styles.flex}><Text style={styles.smallLabel}>{owner('ownerOpensAt')}</Text><TextInput value={hours.open} onChangeText={(value) => updateHours(day.key, 'open', value)} editable={!closed} maxLength={5} placeholder="09:00" placeholderTextColor="#94A3B8" style={[styles.input, closed && styles.disabledInput]} /></View>
                <View style={styles.flex}><Text style={styles.smallLabel}>{owner('ownerClosesAt')}</Text><TextInput value={hours.close} onChangeText={(value) => updateHours(day.key, 'close', value)} editable={!closed} maxLength={5} placeholder="18:00" placeholderTextColor="#94A3B8" style={[styles.input, closed && styles.disabledInput]} /></View>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{owner('ownerRestaurantFacilities')}</Text>
        <Text style={styles.body}>{owner('ownerRestaurantFacilitiesHint')}</Text>
        <Field label={owner('ownerRestaurantFacilities')} value={facilityText} onChangeText={setFacilityText} multiline placeholder={owner('ownerRestaurantFacilitiesPlaceholder')} />
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{owner('ownerRestaurantPhotos')}</Text>
          <Text style={styles.photoCount}>{photos.length}/{RESTAURANT_PHOTO_MAX_COUNT}</Text>
        </View>
        <Text style={styles.body}>{owner('ownerRestaurantPhotosHint')}</Text>
        <View style={styles.photoGrid}>
          {photos.length === 0 ? (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image-outline" size={25} color={OwnerPortalColors.muted} />
              <Text style={styles.photoPlaceholderText}>Insert picture</Text>
            </View>
          ) : null}
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoItem}>
              <Image source={{ uri: photo.url }} style={styles.photo} accessibilityLabel={photo.altText} />
              {!previewMode ? <Pressable onPress={() => removePhoto(photo)} disabled={removingPhotoId === photo.id} style={styles.removePhoto} accessibilityRole="button" accessibilityLabel={owner('ownerRemoveRestaurantPhoto')}><Ionicons name="close" size={17} color="#fff" /></Pressable> : null}
            </View>
          ))}
        </View>
        <Pressable onPress={() => void addPhotos()} disabled={previewMode || uploading || photos.length >= RESTAURANT_PHOTO_MAX_COUNT} style={[styles.secondaryButton, (previewMode || uploading || photos.length >= RESTAURANT_PHOTO_MAX_COUNT) && styles.disabledButton]} accessibilityRole="button">
          {uploading ? <ActivityIndicator color={OwnerPortalColors.orange} /> : <Ionicons name="images-outline" size={18} color={OwnerPortalColors.orange} />}
          <Text style={styles.secondaryButtonText}>{uploading ? owner('ownerUploadingRestaurantPhotos') : owner('ownerAddRestaurantPhotos')}</Text>
        </Pressable>
      </View>

      <View style={styles.warning}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#8a5a00" />
        <Text style={styles.body}>{owner('ownerRestaurantProtectedFieldsNote')}</Text>
      </View>
      <Pressable onPress={() => void save()} disabled={previewMode || saving} style={[styles.primaryButton, (previewMode || saving) && styles.disabledButton]} accessibilityRole="button">
        {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="save-outline" size={18} color="#fff" />}
        <Text style={styles.primaryButtonText}>{saving ? owner('ownerSaving') : owner('ownerSaveRestaurantInformation')}</Text>
      </Pressable>
      {validationError ? <Text style={styles.validationHint}>{owner('ownerRestaurantFormValidationHint')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 14 },
  flex: { flex: 1 },
  loading: { padding: 36, alignItems: 'center', gap: 10 },
  muted: { color: OwnerPortalColors.muted, fontSize: 12 },
  notice: { backgroundColor: OwnerPortalColors.orangeTint, borderRadius: 13, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: OwnerPortalColors.border, padding: 15, gap: 13 },
  sectionTitle: { color: OwnerPortalColors.ink, fontSize: 16, fontWeight: '800' },
  title: { color: OwnerPortalColors.ink, fontSize: 16, fontWeight: '800' },
  body: { color: '#5c6c80', fontSize: 12, lineHeight: 18, flex: 1 },
  field: { gap: 6, flex: 1 },
  label: { color: OwnerPortalColors.inkSoft, fontSize: 12, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: OwnerPortalColors.border, borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 11, paddingVertical: 10, color: OwnerPortalColors.ink, fontSize: 14 },
  multiline: { minHeight: 82, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  dayRow: { borderTopWidth: 1, borderTopColor: '#edf1f5', paddingTop: 11, gap: 8 },
  dayHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { color: OwnerPortalColors.inkSoft, fontSize: 13, fontWeight: '800' },
  closedToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 5 },
  closedToggleActive: { backgroundColor: OwnerPortalColors.orangeTint, borderRadius: 8 },
  closedText: { color: OwnerPortalColors.muted, fontSize: 11, fontWeight: '700' },
  closedTextActive: { color: OwnerPortalColors.orange },
  smallLabel: { color: OwnerPortalColors.muted, fontSize: 10, marginBottom: 4 },
  disabledInput: { backgroundColor: '#f1f4f8', color: '#94a3b8' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoCount: { color: OwnerPortalColors.muted, fontSize: 12, fontWeight: '700' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  photoItem: { width: '31%', aspectRatio: 1, position: 'relative' },
  photoPlaceholder: { width: '31%', aspectRatio: 1, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: OwnerPortalColors.border, backgroundColor: '#FAFAF9', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoPlaceholderText: { color: OwnerPortalColors.muted, fontSize: 11, fontWeight: '700' },
  photo: { width: '100%', height: '100%', borderRadius: 10, backgroundColor: '#eef2f7' },
  removePhoto: { position: 'absolute', top: 5, right: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: '#a22', alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { borderWidth: 1, borderColor: OwnerPortalColors.orangeSoft, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { color: OwnerPortalColors.orange, fontWeight: '800', fontSize: 13 },
  warning: { backgroundColor: '#fff4df', borderRadius: 12, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  primaryButton: { backgroundColor: OwnerPortalColors.orange, borderRadius: 11, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  disabledButton: { opacity: 0.55 },
  validationHint: { color: '#8a5a00', fontSize: 11, textAlign: 'center' },
});
