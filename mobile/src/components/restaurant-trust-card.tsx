import { StyleSheet, Text, View } from 'react-native';

import { TrustBadge } from '@/components/trust-badge';
import type { Restaurant } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/i18n/translations';
import { restaurantTrust } from '@/logic/trust-score';

// The sources as they are saved in the database, and their label.
const SOURCE_LABEL: Record<string, TranslationKey> = {
  menu: 'sourceMenu',
  '원산지 label': 'sourceOriginLabel',
  reviews: 'sourceReviews',
};

export function RestaurantTrustCard({ restaurant }: { restaurant: Restaurant }) {
  const { t } = useTranslation();
  const trust = restaurantTrust(restaurant);

  const sources = trust.sources.map((source) => {
    const key = SOURCE_LABEL[source];
    return key ? t(key) : source;
  });

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.title}>{t('dataConfidence')}</Text>
        <TrustBadge confidence={trust.confidence} />
      </View>

      <Text style={styles.sub}>
        {t('dishesVerified', {
          verified: trust.verifiedDishes,
          total: trust.totalDishes,
        })}
      </Text>

      <Text style={styles.sub}>
        {t('sources')}: {sources.length > 0 ? sources.join(', ') : t('noSourcesYet')}
      </Text>

      {trust.confidence !== 'high' && (
        <Text style={styles.hint}>{t('confidenceHint')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 12,
    gap: 4,
    borderRadius: 12,
    backgroundColor: '#f4f7fa',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#14213d' },
  sub: { color: '#666' },
  hint: { fontSize: 12, color: '#888' },
});