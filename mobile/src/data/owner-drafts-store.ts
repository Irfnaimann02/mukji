import AsyncStorage from '@react-native-async-storage/async-storage';

export type ApplicationKind = 'existing' | 'new';

export type ApplicationDraft = {
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

export type DishDraft = {
  id: string;
  nameKo: string;
  nameEn: string;
  priceWon: string;
  contains: string;
  mayContain: string;
  leaveOutKo: string;
  leaveOutEn: string;
};

export type RestaurantDraft = {
  nameKo: string;
  nameEn: string;
  address: string;
  phone: string;
  originText: string;
  dishes: DishDraft[];
};

const APPLICATION_KEY = 'mukji_owner_application_draft_v2';
const RESTAURANT_DRAFTS_KEY = 'mukji_owner_restaurant_drafts_v2';

function storageKey(base: string, ownerKey: string): string {
  return `${base}_${ownerKey}`;
}

export async function loadOwnerApplicationDraft(
  ownerKey: string,
): Promise<ApplicationDraft | null> {
  const saved = await AsyncStorage.getItem(storageKey(APPLICATION_KEY, ownerKey));
  return saved ? (JSON.parse(saved) as ApplicationDraft) : null;
}

export async function saveOwnerApplicationDraft(
  ownerKey: string,
  draft: ApplicationDraft,
): Promise<void> {
  await AsyncStorage.setItem(
    storageKey(APPLICATION_KEY, ownerKey),
    JSON.stringify(draft),
  );
}

export async function loadOwnerRestaurantDrafts(
  ownerKey: string,
): Promise<Record<string, RestaurantDraft>> {
  const saved = await AsyncStorage.getItem(storageKey(RESTAURANT_DRAFTS_KEY, ownerKey));
  return saved ? (JSON.parse(saved) as Record<string, RestaurantDraft>) : {};
}

export async function saveOwnerRestaurantDrafts(
  ownerKey: string,
  drafts: Record<string, RestaurantDraft>,
): Promise<void> {
  await AsyncStorage.setItem(
    storageKey(RESTAURANT_DRAFTS_KEY, ownerKey),
    JSON.stringify(drafts),
  );
}
