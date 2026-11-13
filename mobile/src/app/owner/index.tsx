import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isValidEmail, myOwnedRestaurantIds, signOut } from '@/data/auth';
import { setAppMode } from '@/data/app-mode';
import type { Restaurant } from '@/data/types';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { listRestaurants } from '@/logic/restaurant-service';

const APPLICATION_KEY = 'mukji_owner_application_draft_v2';
const RESTAURANT_DRAFTS_KEY = 'mukji_owner_restaurant_drafts_v2';

const ALLOWED_INGREDIENTS = [
  'pork',
  'beef',
  'chicken',
  'seafood',
  'egg',
  'dairy',
  'alcohol',
  'peanut',
  'wheat',
  'soy',
] as const;

type PortalTab = 'overview' | 'restaurant' | 'menu' | 'reservations' | 'settings';
type ApplicationKind = 'existing' | 'new';

type ApplicationDraft = {
  kind: ApplicationKind;
  existingRestaurantId: string;
  businessNameKo: string;
  businessName: string;
  ownerName: string;
  email: string;
  address: string;
  phone: string;
  message: string;
  halalClaim: 'not_claiming' | 'certified' | 'not_certified';
};

type DishDraft = {
  id: string;
  nameKo: string;
  nameEn: string;
  priceWon: string;
  contains: string;
  mayContain: string;
  leaveOutKo: string;
  leaveOutEn: string;
};

type RestaurantDraft = {
  nameKo: string;
  nameEn: string;
  address: string;
  phone: string;
  originText: string;
  dishes: DishDraft[];
};

const EMPTY_APPLICATION: ApplicationDraft = {
  kind: 'existing',
  existingRestaurantId: '',
  businessNameKo: '',
  businessName: '',
  ownerName: '',
  email: '',
  address: '',
  phone: '',
  message: '',
  halalClaim: 'not_claiming',
};

function storageKey(base: string, userId: string) {
  return `${base}_${userId}`;
}

function makeRestaurantDraft(restaurant: Restaurant): RestaurantDraft {
  return {
    nameKo: restaurant.nameKo,
    nameEn: restaurant.nameEn,
    address: restaurant.address,
    phone: restaurant.phone,
    originText: restaurant.origin
      .map((item) => `${item.itemKo}: ${item.country}`)
      .join('\n'),
    dishes: restaurant.dishes.map((dish) => ({
      id: dish.id,
      nameKo: dish.nameKo,
      nameEn: dish.nameEn,
      priceWon: String(dish.priceWon),
      contains: dish.contains.join(', '),
      mayContain: dish.mayContain.join(', '),
      leaveOutKo: dish.leaveOutKo ?? '',
      leaveOutEn: dish.leaveOutEn ?? '',
    })),
  };
}

function parseIngredientText(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9aa5b1"
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryButton, disabled && styles.disabledButton]}
      accessibilityRole="button">
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export default function OwnerPortalScreen() {
  const auth = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const previewMode = params.preview === '1';
  const { language } = useTranslation();
  const isKo = language === 'ko';
  const copy = useCallback((en: string, ko: string) => (isKo ? ko : en), [isKo]);

  const [loading, setLoading] = useState(true);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [draftError, setDraftError] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [ownedRestaurants, setOwnedRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [application, setApplication] = useState<ApplicationDraft>(EMPTY_APPLICATION);
  const [restaurantDrafts, setRestaurantDrafts] = useState<Record<string, RestaurantDraft>>({});

  const signedInAsOwner = auth.user !== null && !auth.isAnonymous;
  const userId = auth.user?.id ?? '';
  // Preview drafts are stored separately from every real account.
  const draftOwnerKey = previewMode ? 'preview' : userId;

  const selectedRestaurant = useMemo(
    () =>
      ownedRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
      ownedRestaurants[0],
    [ownedRestaurants, selectedRestaurantId],
  );

  const activeDraft = selectedRestaurant
    ? restaurantDrafts[selectedRestaurant.id] ?? makeRestaurantDraft(selectedRestaurant)
    : undefined;

  // Drafts are private to the signed-in account on this device.
  useEffect(() => {
    let alive = true;

    async function loadDrafts() {
      if (!auth.ready || !draftOwnerKey || (!previewMode && auth.isAnonymous)) {
        setDraftsLoading(false);
        return;
      }

      setDraftsLoading(true);
      setDraftError('');

      try {
        const [savedApplication, savedRestaurantDrafts] = await Promise.all([
          AsyncStorage.getItem(storageKey(APPLICATION_KEY, draftOwnerKey)),
          AsyncStorage.getItem(storageKey(RESTAURANT_DRAFTS_KEY, draftOwnerKey)),
        ]);

        if (!alive) return;

        if (savedApplication) {
          const parsed = JSON.parse(savedApplication) as Partial<ApplicationDraft>;
          setApplication({ ...EMPTY_APPLICATION, ...parsed });
        } else {
          setApplication(EMPTY_APPLICATION);
        }

        if (savedRestaurantDrafts) {
          const parsed = JSON.parse(savedRestaurantDrafts) as Record<string, RestaurantDraft>;
          setRestaurantDrafts(parsed);
        } else {
          setRestaurantDrafts({});
        }
      } catch (error) {
        if (!alive) return;
        setDraftError(
          error instanceof Error
            ? error.message
            : copy('Saved drafts could not be read.', '저장된 초안을 불러오지 못했습니다.'),
        );
      } finally {
        if (alive) setDraftsLoading(false);
      }
    }

    void loadDrafts();

    return () => {
      alive = false;
    };
  }, [auth.ready, auth.isAnonymous, draftOwnerKey, previewMode, copy]);

  // Restaurant ownership is assigned by the Mukji team in Supabase.
  useEffect(() => {
    let alive = true;

    async function loadOwnerData() {
      if (!auth.ready) return;

      if (!signedInAsOwner && !previewMode) {
        setOwnedRestaurants([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setPortalError('');

      try {
        const allRestaurants = await listRestaurants();
        if (!alive) return;
        setRestaurants(allRestaurants);

        if (previewMode) {
          // Preview mode uses a sample public restaurant only. It never reads
          // or changes the Supabase owners table and grants no owner access.
          const previewRestaurants = allRestaurants.slice(0, 1);
          setOwnedRestaurants(previewRestaurants);
          setSelectedRestaurantId(previewRestaurants[0]?.id ?? '');
          return;
        }

        const ownedIds = await myOwnedRestaurantIds();
        if (!alive) return;
        const linked = allRestaurants.filter((restaurant) => ownedIds.includes(restaurant.id));
        setOwnedRestaurants(linked);

        setSelectedRestaurantId((current) =>
          linked.some((restaurant) => restaurant.id === current)
            ? current
            : linked[0]?.id ?? '',
        );
      } catch (error) {
        if (!alive) return;
        setPortalError(
          error instanceof Error
            ? error.message
            : copy('Could not load your owner information.', '사장님 정보를 불러오지 못했습니다.'),
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadOwnerData();

    return () => {
      alive = false;
    };
  }, [auth.ready, auth.user?.id, signedInAsOwner, previewMode, copy]);

  function updateApplication<K extends keyof ApplicationDraft>(
    key: K,
    value: ApplicationDraft[K],
  ) {
    setApplication((current) => ({ ...current, [key]: value }));
  }

  function validateApplication(): string | null {
    const email = application.email.trim() || auth.email || '';

    if (!application.ownerName.trim()) {
      return copy('Enter the owner name.', '신청자 이름을 입력해 주세요.');
    }
    if (!isValidEmail(email)) {
      return copy('Enter a valid contact email.', '올바른 연락 이메일을 입력해 주세요.');
    }

    if (application.kind === 'existing' && !application.existingRestaurantId) {
      return copy('Choose a restaurant to claim.', '소유권을 신청할 음식점을 선택해 주세요.');
    }

    if (application.kind === 'new') {
      if (!application.businessNameKo.trim() || !application.businessName.trim()) {
        return copy(
          'Enter the restaurant name in Korean and English.',
          '음식점 이름을 한국어와 영어로 입력해 주세요.',
        );
      }
      if (!application.address.trim() || !application.phone.trim()) {
        return copy('Enter the restaurant address and phone number.', '음식점 주소와 전화번호를 입력해 주세요.');
      }
    }

    return null;
  }

  async function saveApplicationDraft() {
    const validationError = validateApplication();
    if (validationError) {
      Alert.alert(copy('Check the application', '신청서 확인'), validationError);
      return;
    }
    if (!draftOwnerKey) {
      Alert.alert(copy('Sign-in required', '로그인이 필요합니다'));
      return;
    }

    setSaving(true);
    try {
      const valueToSave = { ...application, email: application.email.trim() || auth.email || '' };
      await AsyncStorage.setItem(
        storageKey(APPLICATION_KEY, draftOwnerKey),
        JSON.stringify(valueToSave),
      );
      setApplication(valueToSave);
      Alert.alert(
        copy('Draft saved', '임시 저장 완료'),
        copy(
          'This draft is saved only on this device. It has not been submitted to Mukji.',
          '초안이 이 기기에만 저장되었습니다. Mukji 팀에 제출되지 않았습니다.',
        ),
      );
    } catch {
      Alert.alert(copy('Save failed', '저장 실패'), copy('Please try again.', '다시 시도해 주세요.'));
    } finally {
      setSaving(false);
    }
  }

  function updateRestaurantField(
    key: keyof Omit<RestaurantDraft, 'dishes'>,
    value: string,
  ) {
    if (!selectedRestaurant) return;
    const restaurantId = selectedRestaurant.id;

    setRestaurantDrafts((current) => {
      const base = current[restaurantId] ?? makeRestaurantDraft(selectedRestaurant);
      return { ...current, [restaurantId]: { ...base, [key]: value } };
    });
  }

  function updateDishField(dishId: string, key: keyof Omit<DishDraft, 'id'>, value: string) {
    if (!selectedRestaurant) return;
    const restaurantId = selectedRestaurant.id;

    setRestaurantDrafts((current) => {
      const base = current[restaurantId] ?? makeRestaurantDraft(selectedRestaurant);
      return {
        ...current,
        [restaurantId]: {
          ...base,
          dishes: base.dishes.map((dish) =>
            dish.id === dishId ? { ...dish, [key]: value } : dish,
          ),
        },
      };
    });
  }

  function addDishDraft() {
    if (!selectedRestaurant) return;
    const restaurantId = selectedRestaurant.id;
    const newDish: DishDraft = {
      id: `local-draft-${Date.now()}`,
      nameKo: '',
      nameEn: '',
      priceWon: '0',
      contains: '',
      mayContain: '',
      leaveOutKo: '',
      leaveOutEn: '',
    };

    setRestaurantDrafts((current) => {
      const base = current[restaurantId] ?? makeRestaurantDraft(selectedRestaurant);
      return {
        ...current,
        [restaurantId]: { ...base, dishes: [...base.dishes, newDish] },
      };
    });
  }

  function removeDishDraft(dishId: string) {
    if (!selectedRestaurant) return;
    Alert.alert(
      copy('Delete this menu item?', '이 메뉴를 삭제할까요?'),
      copy('It will be removed from this local draft.', '이 메뉴가 로컬 초안에서 삭제됩니다.'),
      [
        { text: copy('Keep', '유지'), style: 'cancel' },
        {
          text: copy('Delete', '삭제'),
          style: 'destructive',
          onPress: () => {
            const restaurantId = selectedRestaurant.id;
            setRestaurantDrafts((current) => {
              const base = current[restaurantId] ?? makeRestaurantDraft(selectedRestaurant);
              return {
                ...current,
                [restaurantId]: {
                  ...base,
                  dishes: base.dishes.filter((dish) => dish.id !== dishId),
                },
              };
            });
          },
        },
      ],
    );
  }

  function validateRestaurantDraft(draft: RestaurantDraft): string | null {
    if (!draft.nameKo.trim() || !draft.nameEn.trim() || !draft.address.trim()) {
      return copy('Restaurant names and address are required.', '음식점 이름과 주소를 입력해 주세요.');
    }

    for (const dish of draft.dishes) {
      if (!dish.nameKo.trim() || !dish.nameEn.trim()) {
        return copy('Every menu item needs Korean and English names.', '모든 메뉴에 한국어와 영어 이름이 필요합니다.');
      }

      const price = Number(dish.priceWon);
      if (!Number.isInteger(price) || price < 0) {
        return copy('Menu prices must be zero or a positive whole number.', '메뉴 가격은 0 이상의 정수로 입력해 주세요.');
      }

      const ingredients = [...parseIngredientText(dish.contains), ...parseIngredientText(dish.mayContain)];
      const invalid = ingredients.find(
        (ingredient) => !(ALLOWED_INGREDIENTS as readonly string[]).includes(ingredient),
      );
      if (invalid) {
        return copy(
          `Unknown ingredient: ${invalid}. Use the supported English ingredient names.`,
          `지원하지 않는 재료입니다: ${invalid}. Mukji의 영어 재료 이름을 사용해 주세요.`,
        );
      }

      const contains = parseIngredientText(dish.contains);
      const mayContain = parseIngredientText(dish.mayContain);
      const duplicateAcrossFields = contains.find((ingredient) => mayContain.includes(ingredient));
      if (duplicateAcrossFields) {
        return copy(
          `${duplicateAcrossFields} cannot be in both “Contains” and “May contain”.`,
          `${duplicateAcrossFields} 재료는 '포함 성분'과 '포함 가능 성분'에 동시에 입력할 수 없습니다.`,
        );
      }
    }

    return null;
  }

  async function saveRestaurantDraft() {
    if (!selectedRestaurant || !activeDraft || !draftOwnerKey) return;
    const validationError = validateRestaurantDraft(activeDraft);
    if (validationError) {
      Alert.alert(copy('Check the restaurant draft', '음식점 초안 확인'), validationError);
      return;
    }

    setSaving(true);
    try {
      const nextDrafts = { ...restaurantDrafts, [selectedRestaurant.id]: activeDraft };
      await AsyncStorage.setItem(
        storageKey(RESTAURANT_DRAFTS_KEY, draftOwnerKey),
        JSON.stringify(nextDrafts),
      );
      setRestaurantDrafts(nextDrafts);
      Alert.alert(
        copy('Draft saved', '임시 저장 완료'),
        copy(
          'Your changes are saved on this device only. They are not published to Mukji.',
          '변경 사항이 이 기기에만 저장되었습니다. Mukji에 게시되지 않았습니다.',
        ),
      );
    } catch {
      Alert.alert(copy('Save failed', '저장 실패'), copy('Please try again.', '다시 시도해 주세요.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (previewMode) {
      router.replace('/(tabs)/profile');
      return;
    }
    try {
      await signOut();
      router.replace('/owner-login');
    } catch {
      Alert.alert(
        copy('Sign out failed', '로그아웃 실패'),
        copy('Please try again.', '다시 시도해 주세요.'),
      );
    }
  }

  function renderApplicationForm() {
    return (
      <View style={styles.content}>
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={24} color="#1b5fad" />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{copy('Restaurant owner application', '음식점 소유자 신청')}</Text>
            <Text style={styles.bodyText}>
              {copy(
                'Your account is signed in, but it is not linked to a restaurant yet. You can prepare an application draft here.',
                '로그인되었지만 아직 음식점과 연결되지 않았습니다. 여기에서 신청서 초안을 작성할 수 있습니다.',
              )}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{copy('What would you like to do?', '어떤 신청을 원하시나요?')}</Text>
        <View style={styles.choiceRow}>
          {(['existing', 'new'] as const).map((kind) => (
            <Pressable
              key={kind}
              onPress={() => updateApplication('kind', kind)}
              style={[styles.choice, application.kind === kind && styles.choiceActive]}>
              <Text style={[styles.choiceText, application.kind === kind && styles.choiceTextActive]}>
                {kind === 'existing'
                  ? copy('Claim existing restaurant', '기존 음식점 소유권 신청')
                  : copy('Register new restaurant', '새 음식점 등록')}
              </Text>
            </Pressable>
          ))}
        </View>

        {application.kind === 'existing' ? (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{copy('Choose the restaurant', '음식점 선택')}</Text>
            {restaurants.length === 0 ? (
              <Text style={styles.bodyText}>
                {copy(
                  'No restaurant list is available right now. You can save this draft and contact the Mukji team.',
                  '현재 음식점 목록을 불러올 수 없습니다. 초안을 저장하고 Mukji 팀에 문의할 수 있습니다.',
                )}
              </Text>
            ) : (
              restaurants.map((restaurant) => (
                <Pressable
                  key={restaurant.id}
                  onPress={() => updateApplication('existingRestaurantId', restaurant.id)}
                  style={[
                    styles.restaurantChoice,
                    application.existingRestaurantId === restaurant.id && styles.restaurantChoiceActive,
                  ]}>
                  <View style={styles.flex}>
                    <Text style={styles.restaurantName}>{restaurant.nameEn}</Text>
                    <Text style={styles.mutedText}>{restaurant.nameKo} · {restaurant.address}</Text>
                  </View>
                  <Ionicons
                    name={application.existingRestaurantId === restaurant.id ? 'radio-button-on' : 'radio-button-off'}
                    size={21}
                    color="#1b5fad"
                  />
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Field
              label={copy('Restaurant name (Korean)', '음식점 이름 (한국어)')}
              value={application.businessNameKo}
              onChangeText={(value) => updateApplication('businessNameKo', value)}
            />
            <Field
              label={copy('Restaurant name (English)', '음식점 이름 (영어)')}
              value={application.businessName}
              onChangeText={(value) => updateApplication('businessName', value)}
            />
            <Field
              label={copy('Restaurant address', '음식점 주소')}
              value={application.address}
              onChangeText={(value) => updateApplication('address', value)}
              multiline
            />
            <Field
              label={copy('Restaurant phone', '음식점 전화번호')}
              value={application.phone}
              onChangeText={(value) => updateApplication('phone', value)}
              keyboardType="phone-pad"
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{copy('Owner information', '신청자 정보')}</Text>
          <Field
            label={copy('Owner name', '신청자 이름')}
            value={application.ownerName}
            onChangeText={(value) => updateApplication('ownerName', value)}
          />
          <Field
            label={copy('Contact email', '연락 이메일')}
            value={application.email || auth.email || ''}
            onChangeText={(value) => updateApplication('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label={copy('Additional message (optional)', '추가 설명 (선택)')}
            value={application.message}
            onChangeText={(value) => updateApplication('message', value)}
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{copy('Halal information', '할랄 정보')}</Text>
          <Text style={styles.bodyText}>
            {copy(
              'Choose the statement that best describes the restaurant. The Mukji team must review any certificate before a public certification badge can appear.',
              '음식점에 해당하는 항목을 선택해 주세요. 인증 배지가 표시되려면 Mukji 팀의 인증서 확인이 필요합니다.',
            )}
          </Text>
          {([
            ['not_claiming', 'Not claiming halal certification', '할랄 인증을 주장하지 않음'],
            ['certified', 'We have a halal certificate', '할랄 인증서 보유'],
            ['not_certified', 'Halal-friendly, not certified', '할랄 친화적, 공식 인증은 없음'],
          ] as const).map(([value, en, ko]) => (
            <Pressable
              key={value}
              onPress={() => updateApplication('halalClaim', value)}
              style={styles.radioRow}>
              <Ionicons
                name={application.halalClaim === value ? 'radio-button-on' : 'radio-button-off'}
                size={21}
                color="#1b5fad"
              />
              <Text style={styles.bodyText}>{copy(en, ko)}</Text>
            </Pressable>
          ))}
          <View style={styles.uploadPlaceholder}>
            <Ionicons name="document-attach-outline" size={22} color="#6b7a8d" />
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>{copy('Business document', '사업자 관련 서류')}</Text>
              <Text style={styles.mutedText}>
                {copy('Document upload is not connected yet.', '서류 업로드 기능은 아직 연결되지 않았습니다.')}
              </Text>
            </View>
          </View>
          <View style={styles.uploadPlaceholder}>
            <Ionicons name="ribbon-outline" size={22} color="#6b7a8d" />
            <View style={styles.flex}>
              <Text style={styles.fieldLabel}>{copy('Halal certificate (if applicable)', '할랄 인증서 (해당하는 경우)')}</Text>
              <Text style={styles.mutedText}>
                {copy('Certificate upload and verification are not connected yet.', '인증서 업로드 및 확인 기능은 아직 연결되지 않았습니다.')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>{copy('Draft only — not submitted', '임시 저장 전용 — 신청되지 않음')}</Text>
          <Text style={styles.bodyText}>
            {copy(
              'This application is stored on this device only. It is not Pending, Approved or Rejected, and it has not been sent to the Mukji team. Do not enter sensitive document numbers.',
              '신청서는 이 기기에만 저장됩니다. 현재 대기, 승인 또는 거절 상태가 아니며 Mukji 팀에 전송되지 않았습니다. 민감한 서류 번호를 입력하지 마세요.',
            )}
          </Text>
        </View>
        <Pressable
          style={[styles.signOutButton, { borderColor: '#b8cce5', backgroundColor: '#eef4fb' }]}
          onPress={() => {
            void setAppMode('user').then(() => router.replace('/(tabs)'));
          }}
          accessibilityRole="button">
          <Ionicons name="swap-horizontal-outline" size={20} color="#1b5fad" />
          <Text style={[styles.signOutText, { color: '#1b5fad' }]}>{copy('Switch to User Mode', '일반 사용자 모드로 전환')}</Text>
        </Pressable>
        <PrimaryButton
          title={saving ? copy('Saving...', '저장 중...') : copy('Save application draft', '신청서 초안 저장')}
          onPress={() => void saveApplicationDraft()}
          disabled={saving || draftsLoading}
        />
      </View>
    );
  }

  function renderOverview() {
    if (!selectedRestaurant || !activeDraft) return null;
    return (
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{copy('OWNER DASHBOARD', '사장님 대시보드')}</Text>
          <Text style={styles.heroTitle}>{activeDraft.nameEn || selectedRestaurant.nameEn}</Text>
          <Text style={styles.heroSubtitle}>{activeDraft.nameKo || selectedRestaurant.nameKo}</Text>
          <Text style={styles.heroAddress}>{activeDraft.address || selectedRestaurant.address}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeDraft.dishes.length}</Text>
            <Text style={styles.statLabel}>{copy('Menu items', '메뉴')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{selectedRestaurant.recommendCount}</Text>
            <Text style={styles.statLabel}>{copy('Recommendations', '추천 수')}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{copy('Restaurant information', '음식점 정보')}</Text>
          <Text style={styles.bodyText}>{copy('Phone:', '전화번호:')} {activeDraft.phone || '-'}</Text>
          <Text style={styles.bodyText}>{copy('Address:', '주소:')} {activeDraft.address}</Text>
          <Text style={styles.bodyText}>
            {copy('Halal certification:', '할랄 인증:')} {selectedRestaurant.halalCertified
              ? copy('Marked as certified', '인증으로 표시됨')
              : copy('Not marked as certified', '인증으로 표시되지 않음')}
          </Text>
          <Text style={styles.mutedText}>
            {copy(
              'Certification status is controlled by Mukji verification and cannot be changed here.',
              '인증 상태는 Mukji의 확인 절차로 관리되며 여기에서 변경할 수 없습니다.',
            )}
          </Text>
        </View>
        <View style={styles.noticeCard}>
          <Ionicons name="cloud-offline-outline" size={23} color="#1b5fad" />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{copy('Local preview mode', '로컬 미리보기 모드')}</Text>
            <Text style={styles.bodyText}>
              {copy(
                'Edits are saved on this device only. They are not published to the public restaurant page.',
                '수정 사항은 이 기기에만 저장됩니다. 공개 음식점 페이지에는 게시되지 않습니다.',
              )}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  function renderRestaurantEditor() {
    if (!selectedRestaurant || !activeDraft) return null;
    return (
      <View style={styles.content}>
        <View style={styles.noticeCard}>
          <Ionicons name="save-outline" size={22} color="#1b5fad" />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{copy('Local draft editor', '로컬 초안 편집기')}</Text>
            <Text style={styles.bodyText}>
              {copy('Changes here do not update the public restaurant page.', '여기에서 변경해도 공개 음식점 페이지에는 반영되지 않습니다.')}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <Field label={copy('Restaurant name (Korean)', '음식점 이름 (한국어)')} value={activeDraft.nameKo} onChangeText={(value) => updateRestaurantField('nameKo', value)} />
          <Field label={copy('Restaurant name (English)', '음식점 이름 (영어)')} value={activeDraft.nameEn} onChangeText={(value) => updateRestaurantField('nameEn', value)} />
          <Field label={copy('Address', '주소')} value={activeDraft.address} onChangeText={(value) => updateRestaurantField('address', value)} multiline />
          <Field label={copy('Phone number', '전화번호')} value={activeDraft.phone} onChangeText={(value) => updateRestaurantField('phone', value)} keyboardType="phone-pad" />
          <Field
            label={copy('Ingredient origins (one item per line: item: country)', '원산지 (한 줄에 한 항목: 재료: 국가)')}
            value={activeDraft.originText}
            onChangeText={(value) => updateRestaurantField('originText', value)}
            multiline
            placeholder={'e.g. Beef: Australia'}
          />
        </View>
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>{copy('Halal certification is read-only', '할랄 인증은 읽기 전용입니다')}</Text>
          <Text style={styles.bodyText}>
            {copy(
              'The public certification value is controlled by Mukji verification. Owners cannot publish their own certification status from this editor.',
              '공개 인증 정보는 Mukji의 확인 절차로 관리됩니다. 이 편집기에서 사장님이 직접 인증 상태를 게시할 수 없습니다.',
            )}
          </Text>
        </View>
        <PrimaryButton
          title={saving ? copy('Saving...', '저장 중...') : copy('Save local draft', '로컬 초안 저장')}
          onPress={() => void saveRestaurantDraft()}
          disabled={saving || draftsLoading}
        />
      </View>
    );
  }

  function renderMenuEditor() {
    if (!selectedRestaurant || !activeDraft) return null;
    return (
      <View style={styles.content}>
        <View style={styles.noticeCard}>
          <Ionicons name="restaurant-outline" size={22} color="#1b5fad" />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{copy('Menu draft editor', '메뉴 초안 편집기')}</Text>
            <Text style={styles.bodyText}>
              {copy(
                'Use these ingredient names: pork, beef, chicken, seafood, egg, dairy, alcohol, peanut, wheat and soy. Separate items with commas.',
                '다음 재료 이름을 사용하고 쉼표로 구분해 주세요: pork, beef, chicken, seafood, egg, dairy, alcohol, peanut, wheat, soy.',
              )}
            </Text>
          </View>
        </View>

        {activeDraft.dishes.map((dish, index) => (
          <View key={dish.id} style={styles.card}>
            <View style={styles.menuHeader}>
              <Text style={styles.cardTitle}>{copy('Menu item', '메뉴')} {index + 1}</Text>
              <Pressable onPress={() => removeDishDraft(dish.id)} hitSlop={10} accessibilityRole="button">
                <Ionicons name="trash-outline" size={21} color="#b3261e" />
              </Pressable>
            </View>
            <Field label={copy('Name (Korean)', '메뉴 이름 (한국어)')} value={dish.nameKo} onChangeText={(value) => updateDishField(dish.id, 'nameKo', value)} />
            <Field label={copy('Name (English)', '메뉴 이름 (영어)')} value={dish.nameEn} onChangeText={(value) => updateDishField(dish.id, 'nameEn', value)} />
            <Field label={copy('Price (KRW)', '가격 (원)')} value={dish.priceWon} onChangeText={(value) => updateDishField(dish.id, 'priceWon', value.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
            <Field label={copy('Contains', '포함 성분')} value={dish.contains} onChangeText={(value) => updateDishField(dish.id, 'contains', value)} placeholder="e.g. chicken, wheat" autoCapitalize="none" />
            <Field label={copy('May contain / Ask first', '포함 가능 / 확인 필요')} value={dish.mayContain} onChangeText={(value) => updateDishField(dish.id, 'mayContain', value)} placeholder="e.g. dairy, soy" autoCapitalize="none" />
            <Field label={copy('Ordering condition (Korean)', '주문 조건 (한국어)')} value={dish.leaveOutKo} onChangeText={(value) => updateDishField(dish.id, 'leaveOutKo', value)} placeholder="예: 소스 빼 주세요" />
            <Field label={copy('Ordering condition (English)', '주문 조건 (영어)')} value={dish.leaveOutEn} onChangeText={(value) => updateDishField(dish.id, 'leaveOutEn', value)} placeholder="e.g. No sauce, please" />
          </View>
        ))}

        <Pressable style={styles.secondaryButton} onPress={addDishDraft} accessibilityRole="button">
          <Ionicons name="add-circle-outline" size={20} color="#1b5fad" />
          <Text style={styles.secondaryButtonText}>{copy('Add menu item to draft', '초안에 메뉴 추가')}</Text>
        </Pressable>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>{copy('Do not guess ingredients', '재료를 추측해서 입력하지 마세요')}</Text>
          <Text style={styles.bodyText}>
            {copy(
              'Only enter ingredients the restaurant can confirm. If something is uncertain, put it in “May contain / Ask first”. Dish suitability labels are calculated by Mukji from ingredient information and the user profile; they are not manually selected here.',
              '음식점에서 확인할 수 있는 재료만 입력해 주세요. 확실하지 않은 재료는 “포함 가능 / 확인 필요”에 입력하세요. 메뉴 적합 여부는 재료 정보와 사용자 프로필을 바탕으로 Mukji가 계산하므로 여기에서 직접 선택하지 않습니다.',
            )}
          </Text>
        </View>
        <PrimaryButton
          title={saving ? copy('Saving...', '저장 중...') : copy('Save menu draft', '메뉴 초안 저장')}
          onPress={() => void saveRestaurantDraft()}
          disabled={saving || draftsLoading}
        />
      </View>
    );
  }

  function renderReservations() {
    return (
      <View style={styles.content}>
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={48} color="#1b5fad" />
          <Text style={styles.cardTitle}>{copy('Reservation management is waiting for #50', '#50 예약 기능 연동 대기 중')}</Text>
          <Text style={styles.bodyText}>
            {copy(
              'The owner reservation list, customer details, confirmation/decline actions and cancellation alerts will be connected after Issue #50 is integrated. This screen does not show fake bookings.',
              '#50 기능이 통합된 후 사장님 예약 목록, 고객 정보, 승인/거절 및 취소 알림을 연결할 예정입니다. 이 화면에는 가짜 예약을 표시하지 않습니다.',
            )}
          </Text>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{copy('Waiting for #50 integration', '#50 연동 대기')}</Text>
          </View>
        </View>
      </View>
    );
  }

  function renderSettings() {
    return (
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{copy('Account', '계정')}</Text>
          <Text style={styles.bodyText}>{auth.email ?? '-'}</Text>
          <Text style={styles.mutedText}>
            {copy(
              'Owner access is based on restaurant links assigned by the Mukji team.',
              '사장님 접근 권한은 Mukji 팀이 연결한 음식점 정보에 따라 결정됩니다.',
            )}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{copy('Help and support', '도움 및 문의')}</Text>
          <Text style={styles.bodyText}>
            {copy(
              'For restaurant ownership, certification or public data corrections, contact the Mukji team.',
              '음식점 소유권, 인증 또는 공개 정보 수정은 Mukji 팀에 문의해 주세요.',
            )}
          </Text>
        </View>
        <Pressable
          style={[styles.signOutButton, { borderColor: '#b8cce5', backgroundColor: '#eef4fb' }]}
          onPress={() => {
            void setAppMode('user').then(() => router.replace('/(tabs)'));
          }}
          accessibilityRole="button">
          <Ionicons name="swap-horizontal-outline" size={20} color="#1b5fad" />
          <Text style={[styles.signOutText, { color: '#1b5fad' }]}>{copy('Switch to User Mode', '일반 사용자 모드로 전환')}</Text>
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={() => void handleSignOut()} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={20} color="#b3261e" />
          <Text style={styles.signOutText}>{copy('Sign out', '로그아웃')}</Text>
        </Pressable>
      </View>
    );
  }

  const tabs: { key: PortalTab; en: string; ko: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'overview', en: 'Overview', ko: '요약', icon: 'grid-outline' },
    { key: 'restaurant', en: 'Restaurant', ko: '음식점', icon: 'storefront-outline' },
    { key: 'menu', en: 'Menu', ko: '메뉴', icon: 'restaurant-outline' },
    { key: 'reservations', en: 'Reservations', ko: '예약', icon: 'calendar-outline' },
    { key: 'settings', en: 'Settings', ko: '설정', icon: 'settings-outline' },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: copy('Mukji Owner Portal', 'Mukji 사장님 포털') }} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {previewMode && (
          <View style={[styles.noticeCard, { margin: 16, marginBottom: 0 }]}>
            <Ionicons name="eye-outline" size={22} color="#1b5fad" />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{copy('Temporary preview — not owner access', '임시 미리보기 — 사장님 권한이 아닙니다')}</Text>
              <Text style={styles.bodyText}>{copy('You can inspect the owner dashboard and edit local sample drafts. Nothing is submitted or published, and this does not bypass Adib’s owner-account work or Supabase authorization.', '사장님 대시보드를 확인하고 샘플 초안을 로컬에서 편집할 수 있습니다. 변경 사항은 제출되거나 게시되지 않으며 Adib의 계정 작업이나 Supabase 권한을 우회하지 않습니다.')}</Text>
              <Pressable onPress={() => router.replace('/(tabs)/profile')} accessibilityRole="button">
                <Text style={[styles.secondaryButtonText, { marginTop: 8 }]}>{copy('Exit preview', '미리보기 종료')}</Text>
              </Pressable>
            </View>
          </View>
        )}
        {!auth.ready || loading || draftsLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#1b5fad" />
            <Text style={styles.mutedText}>{copy('Loading owner portal...', '사장님 포털 불러오는 중...')}</Text>
          </View>
        ) : !signedInAsOwner && !previewMode ? (
          <View style={styles.emptyCard}>
            <Ionicons name="lock-closed-outline" size={48} color="#1b5fad" />
            <Text style={styles.cardTitle}>{copy('Owner sign-in required', '사장님 로그인이 필요합니다')}</Text>
            <Text style={styles.bodyText}>{copy('Sign in with your restaurant owner email to continue.', '음식점 사장님 이메일로 로그인해 주세요.')}</Text>
            <PrimaryButton title={copy('Go to owner login', '사장님 로그인')} onPress={() => router.replace('/owner-login')} />
            <PrimaryButton
              title={copy('Back to User Mode / Continue as guest', '일반 사용자 모드로 돌아가기 / 게스트로 계속하기')}
              onPress={() => { void setAppMode('user').then(() => router.replace('/(tabs)')); }}
            />
          </View>
        ) : portalError ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={42} color="#b3261e" />
            <Text style={styles.cardTitle}>{copy('Could not load owner information', '사장님 정보를 불러오지 못했습니다')}</Text>
            <Text style={styles.bodyText}>{portalError}</Text>
            <PrimaryButton title={copy('Try again', '다시 시도')} onPress={() => router.replace('/owner')} />
          </View>
        ) : draftError ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={42} color="#b3261e" />
            <Text style={styles.cardTitle}>{copy('Could not load saved drafts', '저장된 초안을 불러오지 못했습니다')}</Text>
            <Text style={styles.bodyText}>{draftError}</Text>
            <PrimaryButton title={copy('Continue without drafts', '초안 없이 계속하기')} onPress={() => setDraftError('')} />
          </View>
        ) : ownedRestaurants.length === 0 ? (
          renderApplicationForm()
        ) : (
          <>
            <View style={styles.topHeader}>
              <View style={styles.flex}>
                <Text style={styles.pageTitle}>{copy('Owner Portal', '사장님 포털')}</Text>
                <Text style={styles.mutedText}>{copy('Manage your restaurant information', '음식점 정보를 관리하세요')}</Text>
              </View>
              <View style={styles.ownerAvatar}><Ionicons name="person" size={21} color="#1b5fad" /></View>
            </View>

            {ownedRestaurants.length > 1 && (
              <View style={styles.restaurantPicker}>
                <Text style={styles.fieldLabel}>{copy('Your restaurants', '내 음식점')}</Text>
                {ownedRestaurants.map((restaurant) => (
                  <Pressable
                    key={restaurant.id}
                    onPress={() => setSelectedRestaurantId(restaurant.id)}
                    style={[styles.restaurantChoice, selectedRestaurant?.id === restaurant.id && styles.restaurantChoiceActive]}>
                    <View style={styles.flex}>
                      <Text style={styles.restaurantName}>{restaurant.nameEn}</Text>
                      <Text style={styles.mutedText}>{restaurant.nameKo}</Text>
                    </View>
                    <Ionicons name={selectedRestaurant?.id === restaurant.id ? 'radio-button-on' : 'radio-button-off'} size={21} color="#1b5fad" />
                  </Pressable>
                ))}
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {tabs.map((tab) => (
                <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}>
                  <Ionicons name={tab.icon} size={17} color={activeTab === tab.key ? '#fff' : '#6b7a8d'} />
                  <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>{copy(tab.en, tab.ko)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'restaurant' && renderRestaurantEditor()}
            {activeTab === 'menu' && renderMenuEditor()}
            {activeTab === 'reservations' && renderReservations()}
            {activeTab === 'settings' && renderSettings()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7fa' },
  page: { paddingBottom: 36 },
  flex: { flex: 1 },
  loading: { padding: 40, alignItems: 'center', gap: 12 },
  content: { padding: 16, gap: 14 },
  topHeader: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageTitle: { fontSize: 25, fontWeight: '800', color: '#14213d' },
  ownerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e8f0fb', alignItems: 'center', justifyContent: 'center' },
  heroCard: { padding: 20, borderRadius: 18, backgroundColor: '#1b5fad', gap: 6 },
  eyebrow: { color: '#d9e8fa', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 23, fontWeight: '800' },
  heroSubtitle: { color: '#e8f0fb', fontSize: 15 },
  heroAddress: { color: '#e8f0fb', fontSize: 12, marginTop: 5 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 16, backgroundColor: '#fff', borderRadius: 14, gap: 4 },
  statNumber: { fontSize: 25, fontWeight: '800', color: '#14213d' },
  statLabel: { fontSize: 12, color: '#6b7a8d' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 14, gap: 12 },
  cardTitle: { color: '#14213d', fontSize: 16, fontWeight: '700' },
  sectionTitle: { color: '#14213d', fontSize: 18, fontWeight: '800' },
  bodyText: { color: '#536273', fontSize: 13, lineHeight: 20 },
  mutedText: { color: '#8290a0', fontSize: 12, lineHeight: 18 },
  noticeCard: { backgroundColor: '#e8f0fb', padding: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  warningCard: { backgroundColor: '#fff4df', padding: 15, borderRadius: 14, gap: 7 },
  warningTitle: { color: '#8a5a00', fontWeight: '800', fontSize: 14 },
  field: { gap: 6 },
  fieldLabel: { color: '#344256', fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#d5dde7', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: '#14213d', fontSize: 14 },
  multilineInput: { minHeight: 90, textAlignVertical: 'top' },
  choiceRow: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, borderWidth: 1, borderColor: '#d5dde7', backgroundColor: '#fff', borderRadius: 11, padding: 12, justifyContent: 'center' },
  choiceActive: { borderColor: '#1b5fad', backgroundColor: '#e8f0fb' },
  choiceText: { color: '#536273', fontWeight: '600', fontSize: 12, textAlign: 'center' },
  choiceTextActive: { color: '#1b5fad' },
  restaurantChoice: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e1e7ef', backgroundColor: '#fff', gap: 10, marginTop: 8 },
  restaurantChoiceActive: { borderColor: '#1b5fad', backgroundColor: '#f0f5fc' },
  restaurantName: { color: '#14213d', fontSize: 14, fontWeight: '700' },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5 },
  uploadPlaceholder: { borderWidth: 1, borderColor: '#d5dde7', borderStyle: 'dashed', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryButton: { backgroundColor: '#1b5fad', padding: 15, borderRadius: 11, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  disabledButton: { opacity: 0.55 },
  secondaryButton: { borderWidth: 1, borderColor: '#1b5fad', backgroundColor: '#fff', padding: 14, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { color: '#1b5fad', fontWeight: '700' },
  restaurantPicker: { marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 13, backgroundColor: '#fff' },
  tabRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  tabButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff' },
  tabButtonActive: { backgroundColor: '#1b5fad' },
  tabButtonText: { color: '#6b7a8d', fontSize: 12, fontWeight: '700' },
  tabButtonTextActive: { color: '#fff' },
  emptyCard: { margin: 16, padding: 24, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', gap: 12 },
  pendingBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff4df' },
  pendingBadgeText: { color: '#8a5a00', fontSize: 11, fontWeight: '800' },
  signOutButton: { borderWidth: 1, borderColor: '#e5b7b4', borderRadius: 11, padding: 14, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  signOutText: { color: '#b3261e', fontWeight: '800' },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
