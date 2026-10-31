import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodProfileForm } from '@/components/food-profile-form';

// #4: the food profile for the MVP. Profile, QR and friends (#18) come later.
export default function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f7fa' }} edges={['top']}>
      <FoodProfileForm />
    </SafeAreaView>
  );
}