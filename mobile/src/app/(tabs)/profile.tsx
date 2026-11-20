import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountCard } from '@/components/account-card';
import { FoodProfileForm } from '@/components/food-profile-form';
import { TeamMenuLink } from '@/components/team-menu-link';
import { useTranslation } from '@/hooks/use-translation';

export default function ProfileScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('myProfile')}</Text>
          <Text style={styles.subtitle}>{t('accountAndFoodPreferences')}</Text>
        </View>
        {/* Business Mode, sign out and the owner preview are on the Account settings screen. */}
        <AccountCard />
        {/* Team only (029): menu photos waiting for review. Hidden for everyone else. */}
        <TeamMenuLink />
        <FoodProfileForm />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCF8F5' },
  content: { padding: 16, paddingTop: 24, paddingBottom: 32, gap: 20 },
  header: { gap: 4 },
  title: { color: '#1E1E1E', fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: '#6B6460', fontSize: 14 },
});
