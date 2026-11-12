import { StyleSheet, Text, View } from 'react-native';

import type { CategoryHint } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';

// #47 Layer 2: shown in the menu section when a restaurant has no dishes yet.
// It tells the user what this type of place usually uses. It is always "Ask first", never Safe.
export function CategoryHintCard({ hint }: { hint: CategoryHint }) {
  const { t, language } = useTranslation();
  const typeName = language === 'ko' ? hint.category : hint.nameEn;
  const note = language === 'ko' ? hint.noteKo : hint.noteEn;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.title}>{t('noMenuYet')}</Text>
        <Text style={styles.askFirst}>{t('askFirst')}</Text>
      </View>

      <Text style={styles.type}>{t('typicalFor', { type: typeName })}</Text>

      {note !== '' && <Text style={styles.note}>{note}</Text>}

      {hint.contains.length > 0 && (
        <Text style={styles.small}>
          {t('usuallyContains')}: {hint.contains.join(', ')}
        </Text>
      )}

      {hint.mayContain.length > 0 && (
        <Text style={styles.small}>
          {t('mayContain')}: {hint.mayContain.join(', ')}
        </Text>
      )}

      <Text style={styles.small}>{t('menuNotAdded')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    gap: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f3c58f',
    backgroundColor: '#fff8ef',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14213d',
    flexShrink: 1,
  },
  askFirst: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef6c00',
    borderWidth: 1,
    borderColor: '#ef6c00',
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  type: {
    fontWeight: '600',
    color: '#a66500',
  },
  note: {
    color: '#444',
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    color: '#666',
  },
});
