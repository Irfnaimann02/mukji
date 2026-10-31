import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = { title: string; issue: string };

// Temporary screen body. The issue named here replaces it with the real UI.
export function PlaceholderScreen({ title, issue }: Props) {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.box}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.note}>Placeholder. {issue} builds this screen.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f7fa' },
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#14213d' },
  note: { fontSize: 14, color: '#6b7a8d' },
});
