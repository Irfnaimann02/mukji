import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { BottomTabBarButtonProps } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/hooks/use-translation';

const CORAL = '#F15A3B';
const GREY = '#A49A94';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon = (on: IconName, off: IconName) =>
  Object.assign(
    ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <Ionicons name={focused ? on : off} size={21} color={color as string} />
    ),
    { displayName: `TabIcon(${on}, ${off})` },
  );

function SearchButton({ onPress, accessibilityState, label }: BottomTabBarButtonProps & { label: string }) {
  const focused = !!accessibilityState?.selected;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={accessibilityState} style={styles.searchCell}>
      <View style={[styles.searchCircle, focused && styles.searchCircleActive]}>
        <Ionicons name="search" size={21} color="#fff" />
      </View>
      <Text style={[styles.searchLabel, focused && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { bottom } = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: CORAL,
        tabBarInactiveTintColor: GREY,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2, marginBottom: 2 },
        tabBarStyle: {
          height: 62 + bottom,
          paddingTop: 7,
          paddingBottom: Math.max(bottom, 8),
          backgroundColor: '#fff',
          borderTopColor: '#F0E8E2',
          elevation: 12,
          shadowColor: '#49352D',
          shadowOpacity: 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
      }}>
      <Tabs.Screen name="home" options={{ title: t('home'), tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="reserve" options={{ title: t('reserve'), tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="index" options={{ title: t('searchMap'), tabBarLabel: () => null, tabBarButton: (props) => <SearchButton {...props} label={t('searchMap')} /> }} />
      <Tabs.Screen name="favourites" options={{ title: t('favourites'), tabBarIcon: icon('heart', 'heart-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  searchCell: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  searchCircle: { width: 37, height: 37, borderRadius: 14, backgroundColor: '#F4A18D', alignItems: 'center', justifyContent: 'center', marginTop: -3 },
  searchCircleActive: { backgroundColor: CORAL },
  searchLabel: { color: GREY, fontSize: 9, fontWeight: '700' },
  labelActive: { color: CORAL },
});
