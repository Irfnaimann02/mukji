import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  items: string[];
  value: string;
  onChange: (item: string) => void;
};

// The two-tab bar under the title (Restaurant / History, Restaurants / History).
export function SegmentedTabs({ items, value, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const active = item === value;
        return (
          <Pressable
            key={item}
            onPress={() => onChange(item)}
            style={[styles.tab, active && styles.tabActive]}>
            <Text style={[styles.text, active && styles.textActive]}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#dbe3ec' },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  tabActive: { borderColor: '#1b5fad' },
  text: { color: '#6b7a8d' },
  textActive: { color: '#1b5fad', fontWeight: '700' },
});