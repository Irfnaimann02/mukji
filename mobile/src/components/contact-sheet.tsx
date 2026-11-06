import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Restaurant } from '@/data/types';
import { useReservations } from '@/hooks/use-reservations';

const BLUE = '#1b5fad';

// What to say on the phone. The romanisation is for people who can't read Hangul.
const SAY = {
  ko: '예약하고 싶어요. 두 명이에요.',
  rom: 'Yeyakago sipeoyo. Du myeong-ieyo.',
  en: "I'd like to reserve a table for two.",
};

type Props = {
  restaurant: Restaurant | null; // null = sheet closed
  onClose: () => void;
};

// Bottom sheet for #16: phone number, Call, Copy, group-size note and a Korean sentence.
export function ContactSheet({ restaurant, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { markContacted } = useReservations();
  const [copied, setCopied] = useState(false);
  const hasPhone = !!restaurant?.phone;

  useEffect(() => {
    setCopied(false);
  }, [restaurant?.id]);

  const call = async () => {
    if (!restaurant || !hasPhone) return;
    markContacted(restaurant.id);
    onClose();
    try {
      await Linking.openURL(`tel:${restaurant.phone.replace(/[^0-9+]/g, '')}`);
    } catch {
      // No phone app (e.g. a simulator). The number is still in History.
    }
  };

  const copy = async () => {
    if (!restaurant || !hasPhone) return;
    await Clipboard.setStringAsync(restaurant.phone);
    setCopied(true);
  };

  return (
    <Modal visible={!!restaurant} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.shade}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        {restaurant && (
          <View style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]}>
            <View>
              <Text style={styles.name}>{restaurant.nameEn}</Text>
              <Text style={styles.small}>{restaurant.nameKo}</Text>
            </View>

            <Text style={styles.phone}>
              {hasPhone ? `📞 ${restaurant.phone}` : 'No phone number listed yet.'}
            </Text>

            <View style={styles.two}>
              <Pressable
                onPress={call}
                disabled={!hasPhone}
                style={[styles.btn, !hasPhone && styles.btnOff]}>
                <Text style={styles.btnText}>Call</Text>
              </Pressable>
              <Pressable
                onPress={copy}
                disabled={!hasPhone}
                style={[styles.btn, styles.ghost, !hasPhone && styles.btnOff]}>
                <Text style={[styles.btnText, styles.ghostText]}>{copied ? 'Copied ✓' : 'Copy'}</Text>
              </Pressable>
            </View>

            <Text style={styles.small}>
              Tell them how many people are coming. Many places near campus only take bookings for 4
              or more.
            </Text>

            <View style={styles.say}>
              <Text style={styles.sayKo}>{SAY.ko}</Text>
              <Text style={styles.sayRom}>{SAY.rom}</Text>
              <Text style={styles.small}>{SAY.en}</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,33,61,0.6)' },
  sheet: {
    gap: 10,
    padding: 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#fff',
  },
  name: { fontSize: 18, fontWeight: '700', color: '#14213d' },
  small: { fontSize: 12, color: '#6b7a8d' },
  phone: { fontSize: 16, fontWeight: '700', color: '#14213d' },
  two: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 24, alignItems: 'center', backgroundColor: BLUE },
  btnOff: { opacity: 0.35 },
  btnText: { color: '#fff', fontWeight: '700' },
  ghost: { backgroundColor: '#fff', borderWidth: 1, borderColor: BLUE },
  ghostText: { color: BLUE },
  say: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: '#eef4fb' },
  sayKo: { fontSize: 18, fontWeight: '700', color: '#14213d' },
  sayRom: { fontSize: 13, color: '#14213d' },
});