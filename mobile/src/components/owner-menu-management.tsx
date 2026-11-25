import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { showAlert } from '@/components/show-alert';
import {
  createOwnerMenuItem,
  deleteOwnerMenuItem,
  deleteOwnerMenuItemPhoto,
  loadOwnerMenuItems,
  submitOwnerIngredientChange,
  updateOwnerMenuItem,
  uploadOwnerMenuItemPhoto,
} from '@/data/owner-menu-management-repository';
import type { Restaurant } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import type { OwnerPortalTranslationKey } from '@/i18n/translations';
import {
  ownerMenuItemsFromDishes,
  parseOwnerIngredients,
  validateOwnerMenuItem,
  type OwnerMenuCategory,
  type OwnerMenuItemDraft,
  type OwnerMenuValidationError,
} from '@/logic/owner-menu-management';
import { userMessage } from '@/logic/user-error';
import { OwnerPortalColors } from '@/constants/owner-portal-theme';

type Props = { restaurant: Restaurant; previewMode: boolean };
const CATEGORIES: OwnerMenuCategory[] = ['main', 'side', 'drink', 'other'];
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.8,
  allowsEditing: false,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible, // iPhone: JPEG, not HEIC
};

const VALIDATION_MESSAGES: Record<OwnerMenuValidationError, OwnerPortalTranslationKey> = {
  name_ko_required: 'ownerMenuValidation_name_ko_required',
  name_en_invalid: 'ownerMenuValidation_name_en_invalid',
  price_invalid: 'ownerMenuValidation_price_invalid',
  category_invalid: 'ownerMenuValidation_category_invalid',
  ingredient_unknown: 'ownerMenuValidation_ingredient_unknown',
  ingredient_overlap: 'ownerMenuValidation_ingredient_overlap',
  ingredient_required: 'ownerMenuValidation_ingredient_required',
  ordering_condition_invalid: 'ownerMenuValidation_ordering_condition_invalid',
};

const blankItem = (): OwnerMenuItemDraft => ({
  nameKo: '', nameEn: '', priceWon: '', category: 'main', isAvailable: true,
  contains: '', mayContain: '', leaveOutKo: '', leaveOutEn: '', ingredientsVerified: false, editable: true,
});

export function OwnerMenuManagement({ restaurant, previewMode }: Props) {
  const { owner } = useTranslation();
  const [items, setItems] = useState<OwnerMenuItemDraft[]>([]);
  const [newItem, setNewItem] = useState<OwnerMenuItemDraft>(blankItem);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (previewMode) {
      setItems(ownerMenuItemsFromDishes(restaurant.dishes));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await loadOwnerMenuItems(restaurant.id);
      setItems(ownerMenuItemsFromDishes(rows));
    } catch (cause) {
      setError(userMessage(cause, owner('ownerMenuLoadFailed')));
    } finally {
      setLoading(false);
    }
  }, [owner, previewMode, restaurant.dishes, restaurant.id]);

  useEffect(() => {
    if (previewMode) return;

    let active = true;
    loadOwnerMenuItems(restaurant.id)
      .then((rows) => {
        if (!active) return;
        setItems(ownerMenuItemsFromDishes(rows));
        setError('');
      })
      .catch((cause: unknown) => {
        if (active) setError(userMessage(cause, owner('ownerMenuLoadFailed')));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [owner, previewMode, restaurant.id]);

  const visibleItems = previewMode
    ? ownerMenuItemsFromDishes(restaurant.dishes)
    : items;

  const updateItem = (id: string, patch: Partial<OwnerMenuItemDraft>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const saveItem = async (item: OwnerMenuItemDraft) => {
    if (!item.id || previewMode) return;
    const validation = validateOwnerMenuItem({
      nameKo: item.nameKo, nameEn: item.nameEn, priceWon: item.priceWon,
      category: item.category, contains: item.contains, mayContain: item.mayContain,
      leaveOutKo: item.leaveOutKo, leaveOutEn: item.leaveOutEn,
    });
    if (!validation.ok) {
      showAlert(owner('ownerCheckMenuItem'), owner(VALIDATION_MESSAGES[validation.error]));
      return;
    }
    setBusy(item.id);
    try {
      await updateOwnerMenuItem({
        id: item.id, nameKo: validation.value.nameKo, nameEn: validation.value.nameEn,
        priceWon: validation.value.priceWon, category: validation.value.category, isAvailable: item.isAvailable,
        leaveOutKo: validation.value.leaveOutKo, leaveOutEn: validation.value.leaveOutEn,
      });
      await reload();
      showAlert(owner('ownerMenuSaved'), owner('ownerMenuSavedMessage'));
    } catch (cause) {
      showAlert(owner('ownerMenuSaveFailed'), userMessage(cause, owner('ownerPleaseTryAgain')));
    } finally { setBusy(null); }
  };

  const submitIngredients = async (item: OwnerMenuItemDraft) => {
    if (!item.id || previewMode) return;
    const contains = parseOwnerIngredients(item.contains);
    const mayContain = parseOwnerIngredients(item.mayContain);
    if (contains.unknown.length || mayContain.unknown.length) {
      showAlert(owner('ownerCheckIngredientInformation'), owner('ownerMenuIngredientNamesHelp'));
      return;
    }
    if (contains.ingredients.length + mayContain.ingredients.length === 0) {
      showAlert(owner('ownerCheckIngredientInformation'), owner('ownerMenuIngredientsRequired'));
      return;
    }
    if (contains.ingredients.some((tag) => mayContain.ingredients.includes(tag))) {
      showAlert(owner('ownerCheckIngredientInformation'), owner('ownerMenuIngredientsOverlap'));
      return;
    }
    setBusy(`ingredients:${item.id}`);
    try {
      await submitOwnerIngredientChange({
        dishId: item.id, contains: contains.ingredients, mayContain: mayContain.ingredients,
        note: owner('ownerMenuIngredientChangeNote'),
      });
      await reload();
      showAlert(owner('ownerIngredientReviewSubmitted'), owner('ownerIngredientReviewSubmittedMessage'));
    } catch (cause) {
      showAlert(owner('ownerIngredientSubmitFailed'), userMessage(cause, owner('ownerPleaseTryAgain')));
    } finally { setBusy(null); }
  };

  const choosePhoto = async (item: OwnerMenuItemDraft) => {
    if (!item.id || previewMode) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(owner('ownerMenuPhotoPermissionTitle'), owner('ownerMenuPhotoPermissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotoBusy(item.id);
    try {
      await uploadOwnerMenuItemPhoto({
        restaurantId: restaurant.id,
        dishId: item.id,
        uri: asset.uri,
        mimeType: asset.mimeType,
        filename: asset.fileName,
      });
      await reload();
      showAlert(owner('ownerMenuPhotoSaved'), owner('ownerMenuPhotoSavedMessage'));
    } catch (cause) {
      showAlert(owner('ownerMenuPhotoFailed'), userMessage(cause, owner('ownerPleaseTryAgain')));
    } finally { setPhotoBusy(null); }
  };

  const removePhoto = (item: OwnerMenuItemDraft) => {
    if (!item.id || previewMode) return;
    showAlert(owner('ownerMenuPhotoRemoveTitle'), owner('ownerMenuPhotoRemoveMessage'), [
      { text: owner('ownerCancel'), style: 'cancel' },
      { text: owner('ownerDelete'), style: 'destructive', onPress: async () => {
        setPhotoBusy(item.id!);
        try { await deleteOwnerMenuItemPhoto(restaurant.id, item.id!); await reload(); }
        catch (cause) { showAlert(owner('ownerMenuPhotoFailed'), userMessage(cause, owner('ownerPleaseTryAgain'))); }
        finally { setPhotoBusy(null); }
      } },
    ]);
  };

  const addItem = async () => {
    if (previewMode) return;
    const validation = validateOwnerMenuItem({
      nameKo: newItem.nameKo, nameEn: newItem.nameEn, priceWon: newItem.priceWon,
      category: newItem.category, contains: newItem.contains, mayContain: newItem.mayContain,
      leaveOutKo: newItem.leaveOutKo, leaveOutEn: newItem.leaveOutEn,
    });
    if (!validation.ok) {
      showAlert(owner('ownerCheckMenuItem'), owner(VALIDATION_MESSAGES[validation.error]));
      return;
    }
    setBusy('add');
    try {
      await createOwnerMenuItem({ restaurantId: restaurant.id, value: validation.value });
      setNewItem(blankItem());
      await reload();
      showAlert(
        owner('ownerMenuAdded'),
        owner('ownerMenuAddedAwaitingIngredientReview'),
      );
    } catch (cause) {
      const message = cause instanceof Error && cause.message.includes('ingredients_required_for_unknown_dish')
        ? owner('ownerMenuValidation_ingredient_required')
        : userMessage(cause, owner('ownerPleaseTryAgain'));
      showAlert(owner('ownerMenuAddFailed'), message);
    } finally { setBusy(null); }
  };

  const removeItem = (item: OwnerMenuItemDraft) => {
    if (!item.id || previewMode) return;
    showAlert(owner('ownerDeleteMenuItemTitle'), owner('ownerDeleteMenuItemMessage'), [
      { text: owner('ownerCancel'), style: 'cancel' },
      { text: owner('ownerDelete'), style: 'destructive', onPress: async () => {
        setBusy(`delete:${item.id}`);
        try { await deleteOwnerMenuItem(item.id!); await reload(); }
        catch (cause) { showAlert(owner('ownerMenuDeleteFailed'), userMessage(cause, owner('ownerPleaseTryAgain'))); }
        finally { setBusy(null); }
      } },
    ]);
  };

  if (loading && !previewMode) return <View style={styles.loading}><ActivityIndicator color={OwnerPortalColors.orange} /><Text style={styles.muted}>{owner('ownerLoadingMenu')}</Text></View>;

  return (
    <View style={styles.content}>
      {previewMode ? <View style={styles.notice}><Text style={styles.noticeText}>{owner('ownerMenuPreviewOnly')}</Text></View> : null}
      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void reload()}><Text style={styles.link}>{owner('ownerTryAgain')}</Text></Pressable></View> : null}
      <View style={styles.notice}>
        <Ionicons name="shield-checkmark-outline" size={21} color={OwnerPortalColors.orange} />
        <View style={styles.flex}>
          <Text style={styles.title}>{owner('ownerMenuManagementTitle')}</Text>
          <Text style={styles.body}>{owner('ownerMenuManagementIntro')}</Text>
        </View>
      </View>
      {visibleItems.length === 0 ? <Text style={styles.muted}>{owner('ownerMenuEmpty')}</Text> : null}
      {visibleItems.map((item, index) => (
        <View key={item.id ?? `dish-${index}`} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.title}>{owner('ownerMenuItem')} {index + 1}</Text>
            <View style={styles.row}>
              <Text style={[styles.status, item.ingredientsVerified ? styles.verified : styles.pending]}>
                {item.ingredientsVerified ? owner('ownerIngredientsReviewed') : owner('ownerIngredientsPending')}
              </Text>
              {!item.editable ? <Text style={styles.muted}>{owner('ownerMenuSourceLocked')}</Text> : null}
            </View>
          </View>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.menuPhoto} resizeMode="cover" />
          ) : (
            <View style={styles.menuPhotoPlaceholder}>
              <Ionicons name="image-outline" size={25} color={OwnerPortalColors.muted} />
              <Text style={styles.muted}>{owner('ownerInsertPicture')}</Text>
            </View>
          )}
          {item.editable ? (
            <View style={styles.photoActions}>
              <Pressable style={styles.photoButton} disabled={photoBusy === item.id || previewMode} onPress={() => void choosePhoto(item)}>
                <Ionicons name="image-outline" size={17} color={OwnerPortalColors.orange} />
                <Text style={styles.photoButtonText}>{photoBusy === item.id ? owner('ownerSaving') : owner('ownerMenuPhotoChoose')}</Text>
              </Pressable>
              {item.photoUrl ? <Pressable style={styles.photoRemove} disabled={photoBusy === item.id || previewMode} onPress={() => removePhoto(item)}><Text style={styles.deleteText}>{owner('ownerMenuPhotoRemove')}</Text></Pressable> : null}
            </View>
          ) : null}
          <TextInput style={styles.input} value={item.nameKo} editable={item.editable && !previewMode} onChangeText={(v) => updateItem(item.id!, { nameKo: v })} placeholder={owner('ownerNameKorean')} />
          <TextInput style={styles.input} value={item.nameEn} editable={item.editable && !previewMode} onChangeText={(v) => updateItem(item.id!, { nameEn: v })} placeholder={owner('ownerNameEnglish')} />
          <TextInput style={styles.input} value={item.priceWon} editable={item.editable && !previewMode} onChangeText={(v) => updateItem(item.id!, { priceWon: v.replace(/[^0-9,]/g, '') })} keyboardType="numeric" placeholder={owner('ownerPriceKRW')} />
          <CategoryPicker value={item.category} disabled={!item.editable || previewMode} onChange={(category) => updateItem(item.id!, { category })} />
          <Pressable style={styles.availability} disabled={!item.editable || previewMode} onPress={() => updateItem(item.id!, { isAvailable: !item.isAvailable })}>
            <Ionicons name={item.isAvailable ? 'checkbox' : 'square-outline'} size={20} color={OwnerPortalColors.orange} />
            <Text style={styles.body}>{item.isAvailable ? owner('ownerMenuAvailable') : owner('ownerMenuUnavailable')}</Text>
          </Pressable>
          {item.editable ? (
            <>
              <Pressable style={styles.primary} disabled={busy === item.id || previewMode} onPress={() => void saveItem(item)}>
                <Text style={styles.primaryText}>{busy === item.id ? owner('ownerSaving') : owner('ownerSaveMenuDetails')}</Text>
              </Pressable>
              <View style={styles.separator} />
              <Text style={styles.subtitle}>{owner('ownerIngredientInformation')}</Text>
              <Text style={styles.body}>{owner('ownerMenuIngredientReviewExplanation')}</Text>
              <TextInput style={styles.input} value={item.contains} editable={!previewMode} onChangeText={(v) => updateItem(item.id!, { contains: v })} placeholder={owner('ownerContains')} />
              <TextInput style={styles.input} value={item.mayContain} editable={!previewMode} onChangeText={(v) => updateItem(item.id!, { mayContain: v })} placeholder={owner('ownerMayContainAskFirst')} />
              <TextInput style={styles.input} value={item.leaveOutKo} editable={!previewMode} onChangeText={(v) => updateItem(item.id!, { leaveOutKo: v })} placeholder={owner('ownerOrderingConditionKorean')} />
              <TextInput style={styles.input} value={item.leaveOutEn} editable={!previewMode} onChangeText={(v) => updateItem(item.id!, { leaveOutEn: v })} placeholder={owner('ownerOrderingConditionEnglish')} />
              <Pressable style={styles.secondary} disabled={busy === `ingredients:${item.id}` || previewMode} onPress={() => void submitIngredients(item)}>
                <Text style={styles.secondaryText}>{busy === `ingredients:${item.id}` ? owner('ownerSaving') : owner('ownerSubmitIngredientChange')}</Text>
              </Pressable>
              <Pressable style={styles.delete} disabled={busy === `delete:${item.id}` || previewMode} onPress={() => removeItem(item)}>
                <Ionicons name="trash-outline" size={17} color="#b3261e" /><Text style={styles.deleteText}>{owner('ownerDeleteMenuItem')}</Text>
              </Pressable>
            </>
          ) : <Text style={styles.muted}>{owner('ownerMenuSourceLockedExplanation')}</Text>}
        </View>
      ))}

      {!previewMode ? (
        <View style={styles.card}>
          <Text style={styles.title}>{owner('ownerAddMenuItem')}</Text>
          <Text style={styles.body}>{owner('ownerNewMenuIngredientExplanation')}</Text>
          <TextInput style={styles.input} value={newItem.nameKo} onChangeText={(v) => setNewItem((x) => ({ ...x, nameKo: v }))} placeholder={owner('ownerNameKorean')} />
          <TextInput style={styles.input} value={newItem.nameEn} onChangeText={(v) => setNewItem((x) => ({ ...x, nameEn: v }))} placeholder={owner('ownerNameEnglish')} />
          <TextInput style={styles.input} value={newItem.priceWon} onChangeText={(v) => setNewItem((x) => ({ ...x, priceWon: v.replace(/[^0-9,]/g, '') }))} keyboardType="numeric" placeholder={owner('ownerPriceKRW')} />
          <CategoryPicker value={newItem.category} onChange={(category) => setNewItem((x) => ({ ...x, category }))} />
          <TextInput style={styles.input} value={newItem.contains} onChangeText={(v) => setNewItem((x) => ({ ...x, contains: v }))} placeholder={owner('ownerContains')} />
          <TextInput style={styles.input} value={newItem.mayContain} onChangeText={(v) => setNewItem((x) => ({ ...x, mayContain: v }))} placeholder={owner('ownerMayContainAskFirst')} />
          <TextInput style={styles.input} value={newItem.leaveOutKo} onChangeText={(v) => setNewItem((x) => ({ ...x, leaveOutKo: v }))} placeholder={owner('ownerOrderingConditionKorean')} />
          <TextInput style={styles.input} value={newItem.leaveOutEn} onChangeText={(v) => setNewItem((x) => ({ ...x, leaveOutEn: v }))} placeholder={owner('ownerOrderingConditionEnglish')} />
          <Text style={styles.muted}>{owner('ownerMenuIngredientNamesHelp')}</Text>
          <Pressable style={styles.primary} disabled={busy === 'add'} onPress={() => void addItem()}>
            <Text style={styles.primaryText}>{busy === 'add' ? owner('ownerSaving') : owner('ownerAddMenuItem')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function CategoryPicker({ value, onChange, disabled = false }: { value: OwnerMenuCategory; onChange: (value: OwnerMenuCategory) => void; disabled?: boolean }) {
  const { owner } = useTranslation();
  const labels: Record<OwnerMenuCategory, string> = {
    main: owner('ownerMenuCategoryMain'), side: owner('ownerMenuCategorySide'),
    drink: owner('ownerMenuCategoryDrink'), other: owner('ownerMenuCategoryOther'),
  };
  return <View style={styles.categories}>{CATEGORIES.map((category) => (
    <Pressable key={category} disabled={disabled} onPress={() => onChange(category)} style={[styles.category, value === category && styles.categorySelected]}>
      <Text style={[styles.categoryText, value === category && styles.categoryTextSelected]}>{labels[category]}</Text>
    </Pressable>
  ))}</View>;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  loading: { padding: 30, alignItems: 'center', gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 11 },
  notice: { backgroundColor: OwnerPortalColors.orangeTint, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noticeText: { color: OwnerPortalColors.orange, fontSize: 13, lineHeight: 19 },
  error: { backgroundColor: '#fff0ef', padding: 14, borderRadius: 12, gap: 8 },
  errorText: { color: '#a32620' },
  title: { fontSize: 16, fontWeight: '800', color: OwnerPortalColors.ink },
  subtitle: { fontSize: 14, fontWeight: '800', color: OwnerPortalColors.ink },
  body: { fontSize: 13, color: OwnerPortalColors.inkSoft, lineHeight: 19, flexShrink: 1 },
  muted: { fontSize: 12, color: '#8290a0' },
  menuPhoto: { width: '100%', height: 170, borderRadius: 10, backgroundColor: '#eef2f6' },
  menuPhotoPlaceholder: { width: '100%', height: 170, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: OwnerPortalColors.border, backgroundColor: '#FAFAF9', alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  photoButtonText: { color: OwnerPortalColors.orange, fontWeight: '700', fontSize: 13 },
  photoRemove: { paddingVertical: 6 },
  input: { borderWidth: 1, borderColor: OwnerPortalColors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: OwnerPortalColors.ink, fontSize: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  status: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  verified: { color: '#276749', backgroundColor: '#e5f5ec' },
  pending: { color: '#8a5a00', backgroundColor: '#fff4df' },
  availability: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  category: { borderWidth: 1, borderColor: OwnerPortalColors.border, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7 },
  categorySelected: { borderColor: OwnerPortalColors.orange, backgroundColor: OwnerPortalColors.orangeTint },
  categoryText: { color: OwnerPortalColors.inkSoft, fontSize: 12, fontWeight: '600' },
  categoryTextSelected: { color: OwnerPortalColors.orange },
  primary: { backgroundColor: OwnerPortalColors.orange, borderRadius: 10, padding: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: OwnerPortalColors.orange, borderRadius: 10, padding: 11, alignItems: 'center' },
  secondaryText: { color: OwnerPortalColors.orange, fontWeight: '700' },
  delete: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, padding: 8 },
  deleteText: { color: '#b3261e', fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#e8edf3' },
  link: { color: OwnerPortalColors.orange, fontWeight: '700' },
  flex: { flex: 1 },
});
