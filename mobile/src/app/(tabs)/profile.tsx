import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountCard } from '@/components/account-card';
import { FoodProfileForm } from '@/components/food-profile-form';

// #4: the food profile for the MVP. Profile, QR and friends (#18) come later.
// #45: the account card at the top shows "Guest account" or the owner's email,
// and opens the owner login screen.
export default function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f7fa' }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <AccountCard />
      </View>
      <FoodProfileForm />
    </SafeAreaView>
  );
}