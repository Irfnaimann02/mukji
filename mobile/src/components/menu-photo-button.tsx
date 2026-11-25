import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { showAlert } from '@/components/show-alert';
import type { Restaurant } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import { MENU_PHOTO_NOTE_MAX, menuPhotoErrorKey, menuPhotoPlace, submitMenuPhoto } from '@/logic/menu-photo-service';

// "Send menu photo" on the restaurant page. Anyone (guests too) can snap the
// menu board; the team checks it and turns it into dishes with the dish library.
// Nothing shows in the app until it is approved.

type Picked = { uri: string; mimeType?: string };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.7, // keeps photos well under the 5 MB limit and turns HEIC into JPEG
  allowsEditing: false,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible, // iPhone: JPEG, not HEIC
};

export function MenuPhotoButton({ restaurant }: { restaurant: Restaurant }) {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!menuPhotoPlace(restaurant)) return null;

  const applyPicked = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? undefined });
    setSent(false);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert(t('menuPhotoCameraNeededTitle'), t('menuPhotoCameraNeededBody'));
      return;
    }
    applyPicked(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  };

  const choosePhoto = async () => {
    applyPicked(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  };

  const send = async () => {
    if (!photo || sending) return;
    setSending(true);
    try {
      await submitMenuPhoto(restaurant, photo, note);
      setPhoto(null);
      setNote('');
      setSent(true);
    } catch (error) {
      console.warn('Menu photo failed:', error);
      showAlert(t('updateFailed'), t(menuPhotoErrorKey(error)));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="camera-outline" size={20} color="#1b5fad" />
        <Text style={styles.title}>{t('menuPhotoTitle')}</Text>
      </View>

      {sent ? (
        <Text style={styles.thanks}>✓ {t('menuPhotoThanks')}</Text>
      ) : (
        <Text style={styles.sub}>{t('menuPhotoHint')}</Text>
      )}

      {photo ? (
        <>
          <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" />
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder={t('menuPhotoNotePlaceholder')}
            placeholderTextColor="#8a97a8"
            maxLength={MENU_PHOTO_NOTE_MAX}
          />
          <View style={styles.row}>
            <Pressable style={[styles.button, styles.secondary]} onPress={() => setPhoto(null)} disabled={sending}>
              <Text style={styles.secondaryText}>{t('cancel')}</Text>
            </Pressable>
            <Pressable style={[styles.button, sending && styles.disabled]} onPress={() => void send()} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('menuPhotoSend')}</Text>}
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.row}>
          {/* The camera can't be opened from a web browser, so the web only offers "Choose". */}
          {Platform.OS !== 'web' && (
            <Pressable style={styles.button} onPress={() => void takePhoto()}>
              <Ionicons name="camera" size={17} color="#fff" />
              <Text style={styles.buttonText}>{t('menuPhotoTake')}</Text>
            </Pressable>
          )}
          <Pressable style={[styles.button, styles.secondary]} onPress={() => void choosePhoto()}>
            <Ionicons name="images-outline" size={17} color="#1b5fad" />
            <Text style={styles.secondaryText}>{t('menuPhotoChoose')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8, marginTop: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#14213d' },
  sub: { color: '#6b7a8d', lineHeight: 20 },
  thanks: { color: '#2e7d32', fontWeight: '700', lineHeight: 20 },
  preview: { width: '100%', height: 220, borderRadius: 10, backgroundColor: '#eef2f7' },
  input: {
    borderWidth: 1,
    borderColor: '#d5dde7',
    borderRadius: 10,
    padding: 10,
    color: '#14213d',
    backgroundColor: '#fafcfe',
  },
  row: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#1b5fad',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1b5fad' },
  secondaryText: { color: '#1b5fad', fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
