import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DishFitPill } from '@/components/booking-parts';
import { fetchAiExplanation, type AiExplanation } from '@/data/dish-explanation-repository';
import type { Dish, FoodProfile, Ingredient, Restaurant } from '@/data/types';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/i18n/translations';
import { explainDish, type Reason, type Rule } from '@/logic/dish-explanation';
import { SCAN_SOURCE } from '@/logic/menu-scan';

const BLUE = '#1B5FAD';

const INGREDIENT_LABEL: Record<Ingredient, TranslationKey> = {
  pork: 'avoidPork',
  alcohol: 'avoidAlcohol',
  beef: 'avoidBeef',
  chicken: 'avoidChicken',
  lamb: 'avoidLamb',
  seafood: 'seafood',
  egg: 'egg',
  dairy: 'dairy',
  peanut: 'peanut',
  wheat: 'wheat',
  soy: 'soy',
};

const RULE_LABEL: Record<Rule, TranslationKey> = {
  halal: 'halal',
  vegan: 'vegan',
  no_pork: 'noPork',
  allergy: 'whyYourAllergy',
};

// Known values of restaurant.sources, shown in the user's language. Anything else is shown as written.
const SOURCE_LABEL: Record<string, TranslationKey> = {
  menu: 'whySourceMenu',
  '원산지 label': 'whySourceOrigin',
  reviews: 'whySourceReviews',
  [SCAN_SOURCE]: 'whySourceScan', // #10 part 2: dishes from the Menu Scanner
};

type Props = {
  dish: Dish | null;
  restaurant: Restaurant;
  profile: FoodProfile;
  onClose: () => void;
};

// #10 "Why?" for an Ask first or Avoid dish.
// Top: AI says exactly what is unsure for this dish and this user, and suggests Korean
// questions that fit the situation. Below: the data it is based on and its sources.
// Without AI (no key or offline) the sheet still works with the data-based reasons and questions.
export function DishWhySheet({ dish, restaurant, profile, onClose }: Props) {
  const { t } = useTranslation();
  // The AI answer, remembered with the dish it belongs to.
  const [ai, setAi] = useState<{ dishId: string; answer: AiExplanation | null } | null>(null);

  const explanation = dish ? explainDish(dish, restaurant, profile) : null;
  const status = explanation?.status;
  // undefined = still asking, null = AI not available
  const aiAnswer = dish && ai?.dishId === dish.id ? ai.answer : undefined;
  const aiQuestions = aiAnswer?.questions ?? [];
  // AI questions when there are some, otherwise the app's own.
  const questions = aiQuestions.length > 0 ? aiQuestions : (explanation?.questions ?? []);

  useEffect(() => {
    if (!dish || !status) return;
    let active = true;
    fetchAiExplanation(dish, restaurant, profile, status).then((answer) => {
      if (active) setAi({ dishId: dish.id, answer });
    });
    return () => {
      active = false;
    };
  }, [dish, restaurant, profile, status]);

  const reasonText = (reason: Reason): string => {
    const ingredient = t(INGREDIENT_LABEL[reason.ingredient]);
    if (reason.kind === 'halal_meat') return t('whyHalalMeat', { ingredient });
    const rule = reason.rules.map((r) => t(RULE_LABEL[r])).join(', ');
    return reason.kind === 'contains' ? t('whyContains', { ingredient, rule }) : t('whyMayContain', { ingredient, rule });
  };

  return (
    <Modal visible={dish !== null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          {dish && explanation && (
            <>
              <View style={styles.header}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{dish.nameKo}</Text>
                  <Text style={styles.muted}>{dish.nameEn}</Text>
                </View>
                <DishFitPill status={explanation.status} />
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')} hitSlop={8}>
                  <Ionicons name="close" size={24} color="#1E1E1E" />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.content}>
                {/* AI wording */}
                <View style={styles.aiCard}>
                  <View style={styles.aiLabelRow}>
                    <Ionicons name="sparkles-outline" size={16} color={BLUE} />
                    <Text style={styles.aiLabel}>{t('whyAiLabel')}</Text>
                  </View>
                  {aiAnswer === undefined ? (
                    <View style={styles.aiLoading}>
                      <ActivityIndicator color={BLUE} />
                      <Text style={styles.muted}>{t('whyAiLoading')}</Text>
                    </View>
                  ) : aiAnswer === null ? (
                    <Text style={styles.muted}>{t('whyAiUnavailable')}</Text>
                  ) : (
                    <Text style={styles.aiText}>{aiAnswer.reason}</Text>
                  )}
                </View>

                {/* Questions for the staff, right under the explanation */}
                {questions.length > 0 && (
                  <>
                    <View style={styles.headingRow}>
                      <Text style={styles.headingInline}>{t('whyAskStaff')}</Text>
                      {aiQuestions.length > 0 && <Text style={styles.aiTag}>{t('whyAiSuggested')}</Text>}
                    </View>
                    {questions.map((q) => (
                      <View key={q.ko} style={styles.question}>
                        <Text style={styles.questionKo}>{q.ko}</Text>
                        {q.rom ? <Text style={styles.muted}>{q.rom}</Text> : null}
                        {q.en !== '' && <Text style={styles.muted}>{q.en}</Text>}
                      </View>
                    ))}
                  </>
                )}

                {/* The facts it is based on */}
                <Text style={styles.heading}>{t('whyWhatDataSays')}</Text>
                {explanation.reasons.length === 0 ? (
                  <Text style={styles.body}>{t('whyNothingFlagged')}</Text>
                ) : (
                  explanation.reasons.map((reason, index) => (
                    <View key={`${reason.kind}-${reason.ingredient}-${index}`} style={styles.bulletRow}>
                      <Ionicons
                        name={reason.kind === 'contains' ? 'close-circle' : 'help-circle'}
                        size={18}
                        color={reason.kind === 'contains' ? '#B3402A' : '#A66500'}
                      />
                      <Text style={styles.body}>{reasonText(reason)}</Text>
                    </View>
                  ))
                )}

                <Text style={styles.heading}>{t('whyBasedOn')}</Text>
                {explanation.sources.restaurant.map((source) => (
                  <Text key={source} style={styles.source}>
                    • {SOURCE_LABEL[source] ? t(SOURCE_LABEL[source]) : source}
                  </Text>
                ))}
                {explanation.sources.origin.map((o) => (
                  <Text key={`${o.itemKo}-${o.country}`} style={styles.source}>
                    • {t('whyOriginLine', { item: o.itemKo, country: o.country })}
                  </Text>
                ))}
                <Text style={styles.source}>
                  •{' '}
                  {explanation.sources.verifiedCount === 0
                    ? t('notVerifiedYet')
                    : t('verifiedBy', { count: explanation.sources.verifiedCount })}
                  {explanation.sources.lastChecked ? ` (${explanation.sources.lastChecked})` : ''}
                </Text>

                <Text style={styles.limit}>{t('whyLimit')}</Text>
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 20, 20, 0.35)' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FCF8F5',
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E9E3',
  },
  title: { color: '#1E1E1E', fontSize: 20, fontWeight: '700' },
  muted: { color: '#6B6460', fontSize: 13 },
  content: { padding: 16, paddingBottom: 28, gap: 10 },
  aiCard: {
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D5E2F3',
    backgroundColor: '#F4F8FD',
  },
  aiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiLabel: { color: BLUE, fontSize: 13, fontWeight: '700' },
  aiLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiText: { color: '#1E1E1E', fontSize: 15, lineHeight: 22 },
  heading: { marginTop: 8, color: '#1E1E1E', fontSize: 16, fontWeight: '700' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  headingInline: { color: '#1E1E1E', fontSize: 16, fontWeight: '700' },
  aiTag: {
    color: BLUE,
    backgroundColor: '#E8F0FB',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  body: { flex: 1, color: '#1E1E1E', fontSize: 14, lineHeight: 20 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  source: { color: '#4A4440', fontSize: 14 },
  question: {
    gap: 2,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE7E1',
    backgroundColor: '#FFFFFF',
  },
  questionKo: { color: '#1E1E1E', fontSize: 18, fontWeight: '700' },
  limit: { marginTop: 8, color: '#6B6460', fontSize: 12, lineHeight: 17 },
});
