
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';

import type { Allergen, Diet } from '@/data/types';
import { useProfile } from '@/hooks/use-profile';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/i18n/translations';

const DIETS: { key: Diet; label: TranslationKey }[] = [
  { key: 'halal', label: 'halal' },
  { key: 'vegan', label: 'vegan' },
  { key: 'no_pork', label: 'noPork' },
];

const ALLERGENS: Allergen[] = [
  'peanut',
  'seafood',
  'egg',
  'dairy',
  'wheat',
  'soy',
];

const ALLERGEN_LABELS = {
  peanut: 'peanut',
  seafood: 'seafood',
  egg: 'egg',
  dairy: 'dairy',
  wheat: 'wheat',
  soy: 'soy',
} as const satisfies Record<Allergen, TranslationKey>;

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item)
    ? list.filter((x) => x !== item)
    : [...list, item];
}

export function FoodProfileForm() {
  const { profile, setProfile } = useProfile();
  const { t } = useTranslation();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>
        {t('myFoodProfile')}
      </Text>

      <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 8 }}>
        {t('language')}
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['en', 'ko'] as const).map((language) => {
          const active = profile.language === language;

          return (
            <Pressable
              key={language}
              onPress={() => setProfile({ ...profile, language })}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: active ? '#1b5fad' : '#fff',
                borderWidth: 1,
                borderColor: active ? '#1b5fad' : '#dbe3ec',
              }}>
              <Text
                style={{
                  color: active ? '#fff' : '#14213d',
                  fontWeight: '600',
                }}>
                {language === 'en' ? t('english') : t('korean')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={{ fontSize: 20, fontWeight: '600', marginTop: 16 }}>
        {t('diets')}
      </Text>

      {DIETS.map(({ key, label }) => (
        <Row
          key={key}
          label={t(label)}
          value={profile.diets.includes(key)}
          onChange={() =>
            setProfile({
              ...profile,
              diets: toggle(profile.diets, key),
            })
          }
        />
      ))}

      <Text style={{ fontSize: 20, fontWeight: '600', marginTop: 16 }}>
        {t('allergies')}
      </Text>

      {ALLERGENS.map((allergen) => (
        <Row
          key={allergen}
          label={t(ALLERGEN_LABELS[allergen])}
          value={profile.allergens.includes(allergen)}
          onChange={() =>
            setProfile({
              ...profile,
              allergens: toggle(profile.allergens, allergen),
            })
          }
        />
      ))}
    </ScrollView>
  );
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
      }}>
      <Text>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
