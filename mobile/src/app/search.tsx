import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLUE = '#1b5fad';

export default function SearchScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Search</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7fa', padding: 16 },
  back: { color: BLUE, fontSize: 16, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700' },
});