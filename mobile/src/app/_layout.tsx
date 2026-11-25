import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { ProfileProvider } from '@/hooks/use-profile';

export default function RootLayout() {
  return (
    <ProfileProvider>
      <StatusBar style="dark" />
      {/* Foldables, tablets and laptops: keep the phone layout in a centred column */}
      <View style={styles.outer}>
        <View style={styles.frame}>
          <Stack
            screenOptions={{
              headerShown: false,
              // iOS 26: with no background the header is see-through glass and covers the top of the page
              headerStyle: { backgroundColor: '#FCF8F5' },
              headerShadowVisible: false,
              headerTintColor: '#B3402A',
              // only the back arrow, not "(tabs)"
              headerBackButtonDisplayMode: 'minimal',
            }}>
            <Stack.Screen
              name="order-card"
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
          </Stack>
        </View>
      </View>
    </ProfileProvider>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#F0E9E3' },
  frame: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
});