import { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

import type { Restaurant } from '@/data/types';

interface Props {
  restaurant: Restaurant | null;
  visible: boolean;
  onClose: () => void;
}

export function ReservationContactSheet({
  restaurant,
  visible,
  onClose,
}: Props) {
  const [busy, setBusy] = useState(false);

  if (!restaurant) return null;

  const phone = restaurant.phone?.trim() ?? '';
  const hasPhone = phone.length > 0;

  const handleCall = async () => {
    if (!hasPhone || busy) return;

    setBusy(true);

    try {
      const phoneNumber = phone.replace(/[^\d+]/g, '');
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch {
      Alert.alert(
        'Unable to open phone app',
        'Please try again or copy the phone number.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!hasPhone || busy) return;

    setBusy(true);

    try {
      await Clipboard.setStringAsync(phone);
      Alert.alert(
        'Copied',
        'The restaurant phone number has been copied.'
      );
    } catch {
      Alert.alert('Copy failed', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={styles.title}>Do reservation</Text>
          <Text style={styles.name}>{restaurant.nameEn}</Text>
          <Text style={styles.koreanName}>{restaurant.nameKo}</Text>

          <View style={styles.phoneBox}>
            <Text style={styles.phoneLabel}>
              Restaurant phone number
            </Text>

            <Text style={styles.phone}>
              {hasPhone ? phone : 'Phone number unavailable'}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={!hasPhone || busy}
              onPress={handleCall}
              style={[
                styles.actionButton,
                styles.callButton,
                (!hasPhone || busy) && styles.disabled,
              ]}>
              <Text style={styles.callText}>Call</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!hasPhone || busy}
              onPress={handleCopy}
              style={[
                styles.actionButton,
                styles.copyButton,
                (!hasPhone || busy) && styles.disabled,
              ]}>
              <Text style={styles.copyText}>Copy</Text>
            </Pressable>
          </View>

          <Text style={styles.note}>
            Please tell the restaurant how many people are coming.
          </Text>

          <View style={styles.phraseBox}>
            <Text style={styles.phraseKo}>
              예약하고 싶어요. 두 명이에요.
            </Text>

            <Text style={styles.phraseEn}>
              I&apos;d like to reserve a table for two.
            </Text>
          </View>

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 33, 61, 0.55)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 4,
    backgroundColor: '#dbe3ec',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#14213d',
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#14213d',
  },
  koreanName: {
    color: '#6b7a8d',
  },
  phoneBox: {
    backgroundColor: '#f4f7fa',
    borderRadius: 12,
    padding: 14,
    gap: 5,
    marginTop: 6,
  },
  phoneLabel: {
    color: '#6b7a8d',
    fontSize: 12,
  },
  phone: {
    color: '#14213d',
    fontSize: 19,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#1b5fad',
  },
  copyButton: {
    backgroundColor: '#e8f0fb',
  },
  callText: {
    color: '#fff',
    fontWeight: '700',
  },
  copyText: {
    color: '#1b5fad',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
  note: {
    color: '#6b7a8d',
    fontSize: 13,
    marginTop: 8,
  },
  phraseBox: {
    backgroundColor: '#eef4fb',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  phraseKo: {
    color: '#14213d',
    fontSize: 18,
    fontWeight: '700',
  },
  phraseEn: {
    color: '#6b7a8d',
    fontSize: 13,
  },
  closeButton: {
    alignItems: 'center',
    padding: 12,
  },
  closeText: {
    color: '#6b7a8d',
    fontWeight: '600',
  },
});