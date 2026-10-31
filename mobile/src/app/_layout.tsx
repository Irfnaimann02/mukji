import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProfileProvider } from '@/hooks/use-profile';

export default function RootLayout() {
  return (
    <ProfileProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="order-card"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </ProfileProvider>
  );
}