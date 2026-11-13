import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountCard } from '@/components/account-card';
import { FoodProfileForm } from '@/components/food-profile-form';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF9F5' }} edges={['top']}>
      <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, gap: 4 }}>
        <Text style={{ color: '#202124', fontSize: 27, fontWeight: '900' }}>My Profile</Text>
        <Text style={{ color: '#8A8581', fontSize: 12 }}>Your account and food preferences</Text>
        <View style={{ marginTop: 12 }}><AccountCard /></View>
        <Pressable
          onPress={() => router.push({ pathname: '/owner', params: { preview: '1' } })}
          accessibilityRole="button"
          style={{ marginTop: 12, padding: 15, borderRadius: 16, backgroundColor: '#EAF2FC', borderWidth: 1, borderColor: '#D5E3F5', flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#DCEAFB', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="storefront-outline" size={20} color="#1B5FAD" />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: '#1B4777', fontSize: 13, fontWeight: '900' }}>Preview Business Owner Page</Text>
            <Text style={{ color: '#62778F', fontSize: 10, lineHeight: 14 }}>Temporary preview until owner account sign-in is ready</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#1B5FAD" />
        </Pressable>
      </View>
      <FoodProfileForm />
    </SafeAreaView>
  );
}
