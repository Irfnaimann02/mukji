import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BLUE = '#1b5fad';
const GREY = '#8a94a3';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Filled icon when the tab is active, outline when it is not.
const icon =
  (on: IconName, off: IconName) =>
  ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? on : off} size={26} color={color} />
  );

// Centre button from our sketch: a raised circle with a magnifier.
function SearchButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  const focused = !!accessibilityState?.selected;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Search map"
      accessibilityState={accessibilityState}
      style={styles.cell}>
      <View style={[styles.circle, !focused && styles.circleIdle]}>
        <Ionicons name="search" size={28} color="#fff" />
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // icons only, like the sketch
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: GREY,
        tabBarStyle: {
          height: 60 + bottom,
          paddingBottom: bottom,
          backgroundColor: '#fff',
          borderTopColor: '#dbe3ec',
        },
      }}>
      {/* The order here is the order on screen. "index" is the Search map, so the app opens on it. */}
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarAccessibilityLabel: 'Home', tabBarIcon: icon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="reserve"
        options={{ title: 'Reserve', tabBarAccessibilityLabel: 'Reserve', tabBarIcon: icon('restaurant', 'restaurant-outline') }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: 'Search map', tabBarButton: (props) => <SearchButton {...props} /> }}
      />
      <Tabs.Screen
        name="favourites"
        options={{ title: 'Favourites', tabBarAccessibilityLabel: 'Favourites', tabBarIcon: icon('heart', 'heart-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarAccessibilityLabel: 'Profile', tabBarIcon: icon('person', 'person-outline') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginTop: -40, // lifts the circle above the bar
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
    borderWidth: 4,
    borderColor: '#f4f7fa',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  circleIdle: { backgroundColor: '#6f9bd1' },
});
