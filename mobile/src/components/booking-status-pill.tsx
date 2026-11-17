import { StyleSheet, Text } from 'react-native';

import type { BookingStatus } from '@/data/booking-repository';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/i18n/translations';

const LABEL: Record<BookingStatus, TranslationKey> = {
  requested: 'bookingStatusRequested',
  confirmed: 'bookingStatusConfirmed',
  declined: 'bookingStatusDeclined',
  cancelled: 'cancelled',
  completed: 'bookingStatusVisited',
};

const COLORS: Record<BookingStatus, { text: string; background: string }> = {
  requested: { text: '#7A5200', background: '#FFF3D1' },
  confirmed: { text: '#1E6B3E', background: '#E3F4EA' },
  declined: { text: '#8E2F1D', background: '#FBEBE7' },
  cancelled: { text: '#5E5752', background: '#F3EEEA' },
  completed: { text: '#1E6B3E', background: '#E3F4EA' },
};

// #50 The status of a booking request, shown to the customer and the owner.
export function BookingStatusPill({ status }: { status: BookingStatus }) {
  const { t } = useTranslation();
  const color = COLORS[status];
  return (
    <Text style={[styles.pill, { color: color.text, backgroundColor: color.background }]}>{t(LABEL[status])}</Text>
  );
}

const styles = StyleSheet.create({
  pill: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
