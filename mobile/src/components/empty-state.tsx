import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  icon: string;
  title: string;
  message: string;
  buttonLabel: string;
  onPress: () => void;
};

export function EmptyState({ icon, title, message, buttonLabel, onPress }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.dome}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable onPress={onPress} style={styles.cta}>
        <Text style={styles.ctaText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 28 },
  dome: {
    width: 160,
    height: 110,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    backgroundColor: '#e6f0fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 48 },
  title: { fontSize: 16, fontWeight: '700', color: '#14213d' },
  message: { textAlign: 'center', color: '#6b7a8d' },
  cta: {
    alignSelf: 'stretch',
    padding: 12,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#1b5fad',
  },
  ctaText: { color: '#fff', fontWeight: '700' },
});