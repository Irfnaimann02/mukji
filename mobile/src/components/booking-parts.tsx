import { StyleSheet, Text, View } from 'react-native';

import type { DishStatus } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/i18n/translations';
import { won, type PreorderLine } from '@/logic/booking-details';
import { dateBlock } from '@/logic/booking-times';

// #50 Small pieces shared by the booking form, the "Request sent" screen,
// the Reservation tab and the owner portal.

// "1 person" / "3 people"
export function usePeopleLabel(): (count: number) => string {
  const { t } = useTranslation();
  return (count) => (count === 1 ? t('bookingOnePerson') : t('bookingPeopleCount', { count }));
}

// WED / 18 / NOV
export function DateBlock({ iso, small = false, muted = false }: { iso: string; small?: boolean; muted?: boolean }) {
  const { language } = useTranslation();
  const block = dateBlock(new Date(iso), language);
  const color = muted ? '#4A4440' : '#1B5FAD';
  return (
    <View style={[styles.dateBlock, small && styles.dateBlockSmall, muted && styles.dateBlockMuted]}>
      <Text style={[styles.dateSide, small && styles.dateSideSmall, { color }]}>{block.dow}</Text>
      <Text style={[styles.dateDay, small && styles.dateDaySmall, { color }]}>{block.day}</Text>
      <Text style={[styles.dateSide, small && styles.dateSideSmall, { color }]}>{block.month}</Text>
    </View>
  );
}

const FIT_LABEL: Record<DishStatus, TranslationKey> = { safe: 'safe', ask_first: 'askFirst', avoid: 'avoid' };
const FIT_COLOR: Record<DishStatus, { text: string; background: string }> = {
  safe: { text: '#1E6B3E', background: '#E3F4EA' },
  ask_first: { text: '#7A5200', background: '#FFF3D1' },
  avoid: { text: '#8E2F1D', background: '#FBEBE7' },
};

// Safe / Ask first / Avoid for the user's food profile.
export function DishFitPill({ status }: { status: DishStatus }) {
  const { t } = useTranslation();
  const color = FIT_COLOR[status];
  return (
    <Text style={[styles.fitPill, { color: color.text, backgroundColor: color.background }]}>
      {t(FIT_LABEL[status])}
    </Text>
  );
}

// "1× 국물떡볶이        ₩4,500", one row per pre-ordered dish.
export function PreorderLines({ lines }: { lines: PreorderLine[] }) {
  return (
    <View style={styles.lines}>
      {lines.map((line) => (
        <View key={line.id} style={styles.line}>
          <Text style={styles.lineName}>
            <Text style={styles.lineQty}>{line.qty}× </Text>
            {line.nameKo}
          </Text>
          {/* no price on the source (chain or typical menu): show none, never ₩0 */}
          {line.lineTotalWon > 0 && <Text style={styles.linePrice}>{won(line.lineTotalWon)}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dateBlock: {
    width: 60,
    borderRadius: 14,
    backgroundColor: '#E8F0FB',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateBlockSmall: { width: 48, borderRadius: 12, paddingVertical: 6 },
  dateBlockMuted: { backgroundColor: '#F3EEEA' },
  dateSide: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  dateSideSmall: { fontSize: 10, letterSpacing: 0.6 },
  dateDay: { fontSize: 24, lineHeight: 28, fontWeight: '900' },
  dateDaySmall: { fontSize: 19, lineHeight: 22 },
  fitPill: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  lines: { gap: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lineName: { flex: 1, color: '#1E1E1E', fontSize: 14 },
  lineQty: { color: '#6B6460' },
  linePrice: { color: '#6B6460', fontSize: 14 },
});
