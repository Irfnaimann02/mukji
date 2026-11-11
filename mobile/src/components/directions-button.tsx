import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { useTranslation } from '@/hooks/use-translation';
import { openDirections, type Destination } from '@/logic/directions';

// #46: asks which map app to use, then opens the walking route.
export function DirectionsButton({ to }: { to: Destination }) {
  const { t } = useTranslation();

  const choose = () =>
    Alert.alert(t('directions'), t('directionsMessage'), [
      { text: t('naverMap'), onPress: () => void openDirections('naver', to) },
      { text: t('kakaoMap'), onPress: () => void openDirections('kakao', to) },
      { text: t('cancel'), style: 'cancel' },
    ]);

  return (
    <Pressable
      style={styles.button}
      onPress={choose}
      accessibilityRole="button"
      accessibilityLabel={t('directions')}>
      <Ionicons name="navigate" size={16} color="#fff" />
      <Text style={styles.text}>{t('directions')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1b5fad',
  },
  text: { color: '#fff', fontSize: 14, fontWeight: '600' },
});