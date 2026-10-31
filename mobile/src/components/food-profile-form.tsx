import { ScrollView, Switch, Text, View } from 'react-native';

import type { Allergen, Diet } from '@/data/types';
import { useProfile } from '@/hooks/use-profile';

const DIETS: { key: Diet; label: string }[] = [
  { key: 'halal', label: 'Halal' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'no_pork', label: 'No pork' },
];
const ALLERGENS: Allergen[] = ['peanut', 'seafood', 'egg', 'dairy', 'wheat', 'soy'];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

// #4: diet and allergy toggles. Saved on the phone through useProfile().
// A component, so it can sit inside the Profile tab (#18) or on its own screen.
export function FoodProfileForm() {
  const { profile, setProfile } = useProfile();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>My food profile</Text>
      {DIETS.map(({ key, label }) => (
        <Row
          key={key}
          label={label}
          value={profile.diets.includes(key)}
          onChange={() => setProfile({ ...profile, diets: toggle(profile.diets, key) })}
        />
      ))}
      <Text style={{ fontSize: 20, fontWeight: '600', marginTop: 16 }}>Allergies</Text>
      {ALLERGENS.map((a) => (
        <Row
          key={a}
          label={a}
          value={profile.allergens.includes(a)}
          onChange={() => setProfile({ ...profile, allergens: toggle(profile.allergens, a) })}
        />
      ))}
    </ScrollView>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
