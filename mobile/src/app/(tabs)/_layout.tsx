import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/hooks/use-translation';

const BLUE = '#1b5fad';
const GREY = '#8a94a3';

function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  return (
    <Ionicons
      name={name}
      size={26}
      color={focused ? BLUE : GREY}
    />
  );
}

export default function TabsLayout() {
  const { bottom } = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: GREY,
        tabBarStyle: {
          height: 60 + bottom,
          paddingBottom: bottom,
          backgroundColor: '#fff',
          borderTopColor: '#dbe3ec',
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: t('home'),
          tabBarAccessibilityLabel: t('home'),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'home' : 'home-outline'}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="reserve"
        options={{
          title: t('reserve'),
          tabBarAccessibilityLabel: t('reserve'),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'restaurant' : 'restaurant-outline'}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: t('searchMap'),
          tabBarAccessibilityLabel: t('searchMap'),
          tabBarButton: (props) => (
            <Pressable
              {...props}
              ref={undefined}
              style={[props.style, styles.searchButton]}>
              <View style={styles.searchCircle}>
                <Ionicons name="search" size={27} color="#fff" />
              </View>
            </Pressable>
          ),
        }}
      />

      <Tabs.Screen
        name="favourites"
        options={{
          title: t('favourites'),
          tabBarAccessibilityLabel: t('favourites'),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'heart' : 'heart-outline'}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarAccessibilityLabel: t('profile'),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'person' : 'person-outline'}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  searchButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginTop: -40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
    borderWidth: 4,
    borderColor: '#f4f7fa',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
});