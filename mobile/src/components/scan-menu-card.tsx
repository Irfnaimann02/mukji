import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

// #10 part 2: the way into the Menu Scanner, on Home and on the restaurant page.
type Props = {
  title: string;
  sub: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>; // e.g. the side margins of the Home screen
};

export function ScanMenuCard({ title, sub, onPress, style }: Props) {
  return (
    <Pressable style={[styles.card, style]} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.icon}>
        <Ionicons name="scan-outline" size={22} color="#1B5FAD" />
      </View>
      <View style={styles.flex}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#8A97A8" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D5E2F3',
    backgroundColor: '#F4F8FD',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0FB',
  },
  flex: { flex: 1, gap: 2 },
  title: { color: '#14213D', fontSize: 16, fontWeight: '700' },
  sub: { color: '#4A5568', fontSize: 13, lineHeight: 18 },
});
