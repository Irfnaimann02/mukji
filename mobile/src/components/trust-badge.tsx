import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/hooks/use-translation';
import type { Confidence } from '@/logic/trust-score';

const CONFIDENCE: Record<
  Confidence,
  { label: 'confidenceHigh' | 'confidenceMedium' | 'confidenceLow'; color: string }
> = {
  high: { label: 'confidenceHigh', color: '#2e7d32' },
  medium: { label: 'confidenceMedium', color: '#ef6c00' },
  low: { label: 'confidenceLow', color: '#757575' },
};

export function TrustBadge({ confidence }: { confidence: Confidence }) {
  const { t } = useTranslation();
  const info = CONFIDENCE[confidence];

  return (
    <View style={[styles.pill, { borderColor: info.color }]}>
      <View style={[styles.dot, { backgroundColor: info.color }]} />
      <Text style={[styles.text, { color: info.color }]}>{t(info.label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '700' },
});