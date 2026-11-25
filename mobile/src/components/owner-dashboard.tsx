import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { Restaurant } from '@/data/types';
import {
  loadOwnerDashboardData,
  type OwnerDashboardApplication,
  type OwnerDashboardData,
} from '@/data/owner-dashboard-repository';
import { useTranslation } from '@/hooks/use-translation';
import { summarizeOwnerDashboard } from '@/logic/owner-dashboard';
import { OwnerPortalColors } from '@/constants/owner-portal-theme';

const ACCENT = OwnerPortalColors.orange;
const EMPTY_DATA: OwnerDashboardData = { applications: [], pendingReservationCount: 0 };

function statusTranslationKey(status: OwnerDashboardApplication['status']) {
  switch (status) {
    case 'submitted': return 'ownerRestaurantApplicationStatusSubmitted';
    case 'under_review': return 'ownerRestaurantApplicationStatusUnderReview';
    case 'needs_information': return 'ownerRestaurantApplicationStatusNeedsInformation';
    case 'approved': return 'ownerRestaurantApplicationStatusApproved';
    case 'rejected': return 'ownerRestaurantApplicationStatusRejected';
    default: return 'ownerRestaurantApplicationStatusDraft';
  }
}

export function OwnerDashboard({
  restaurants,
  selectedRestaurant,
  previewMode = false,
}: {
  restaurants: Restaurant[];
  selectedRestaurant?: Restaurant;
  previewMode?: boolean;
}) {
  const { owner, language } = useTranslation();
  const [data, setData] = useState<OwnerDashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(!previewMode);
  const [error, setError] = useState(false);
  const restaurantIds = useMemo(() => restaurants.map((restaurant) => restaurant.id), [restaurants]);
  const restaurantIdsKey = restaurantIds.join(',');
  const summary = useMemo(() => summarizeOwnerDashboard(data.applications), [data.applications]);

  useEffect(() => {
    // Preview starts with loading=false, so no state update is needed here.
    if (previewMode) return;

    let active = true;
    loadOwnerDashboardData(restaurantIdsKey === '' ? [] : restaurantIdsKey.split(','))
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [restaurantIdsKey, previewMode]);

  const dateLabel = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US');
  };

  const periodLabels = language === 'ko'
    ? ['7일', '30일', '3개월']
    : ['7 Days', '30 Days', '3 Months'];

  const cards = [
    {
      label: language === 'ko' ? '연결된 매장' : 'Linked Restaurants',
      value: String(restaurants.length),
      icon: 'storefront-outline' as const,
      tint: '#FFF0E7',
    },
    {
      label: language === 'ko' ? '예약 응답 대기' : 'Pending Reservations',
      value: previewMode ? '—' : String(data.pendingReservationCount),
      icon: 'calendar-outline' as const,
      tint: '#FFF0E7',
    },
    {
      label: language === 'ko' ? '등록된 메뉴' : 'Menu Items',
      value: selectedRestaurant ? String(selectedRestaurant.dishes.length) : '—',
      icon: 'restaurant-outline' as const,
      tint: '#FFF0E7',
    },
    {
      label: language === 'ko' ? '검토가 필요한 신청' : 'Applications Needing Attention',
      value: previewMode ? '—' : String(summary.needsInformation),
      icon: 'alert-circle-outline' as const,
      tint: '#FFF5E5',
    },
  ];

  const attentionApplications = summary.attentionApplications.slice(0, 3);

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroEyebrow}>{language === 'ko' ? '매장 운영 개요' : 'RESTAURANT OVERVIEW'}</Text>
          {previewMode ? (
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>PREVIEW</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.heroTitle}>
          {language === 'ko' ? '안녕하세요!' : 'Good to see you!'}
        </Text>
        <Text style={styles.heroSubtitle}>
          {selectedRestaurant?.nameEn || selectedRestaurant?.nameKo || (language === 'ko' ? '매장 운영 현황을 확인하세요' : 'Here is your restaurant at a glance.')}
        </Text>
        <View style={styles.heroAccent} />
      </View>

      <View style={styles.sectionHeading}>
        <View style={styles.headingCopy}>
          <Text style={styles.sectionTitle}>{language === 'ko' ? '비즈니스 인사이트' : 'Business Insights'}</Text>
          <Text style={styles.sectionSubtitle}>{language === 'ko' ? '선택한 기간의 운영 지표' : 'Performance overview for the selected period'}</Text>
        </View>
      </View>

      <View style={styles.periodRow} accessibilityLabel={language === 'ko' ? '분석 기간 선택 예정' : 'Analytics period filters planned'}>
        {periodLabels.map((label, index) => (
          <View key={label} style={[styles.periodButton, index === 0 && styles.periodButtonActive, styles.periodButtonDisabled]}>
            <Text style={[styles.periodButtonText, index === 0 && styles.periodButtonTextActive]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.metricsGrid}>
        {cards.map((card) => (
          <View key={card.label} style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: card.tint }]}>
              <Ionicons name={card.icon} size={21} color={ACCENT} />
            </View>
            <Text style={styles.metricValue}>{card.value}</Text>
            <Text style={styles.metricLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.analyticsNotice}>
        <Ionicons name="analytics-outline" size={19} color={ACCENT} />
        <Text style={styles.analyticsNoticeText}>
          {language === 'ko'
            ? '기간별 매출, 예약 추이 및 평점 분석은 지표와 데이터 출처가 확정된 후 제공됩니다.'
            : 'Sales, reservation trends and rating analytics will appear after their metrics and data sources are defined. No sample figures are displayed.'}
        </Text>
      </View>

      <View style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <View style={styles.actionTitleGroup}>
            <View style={styles.actionAlertIcon}>
              <Ionicons name="alert-circle" size={19} color={ACCENT} />
            </View>
            <Text style={styles.sectionTitle}>{language === 'ko' ? '확인 필요' : 'Action Required'}</Text>
          </View>
          {loading ? <ActivityIndicator size="small" color={ACCENT} /> : null}
        </View>

        {previewMode ? (
          <View style={styles.emptyAction}>
            <Ionicons name="lock-closed-outline" size={20} color={OwnerPortalColors.muted} />
            <Text style={styles.emptyActionText}>
              {language === 'ko'
                ? '미리보기에서는 고객 예약 및 계정별 신청 정보가 숨겨집니다. 실제 소유자 계정으로 로그인하면 확인할 수 있습니다.'
                : 'Private reservations and account-specific applications are hidden in direct preview. Sign in with an authorized owner account to view and manage them.'}
            </Text>
          </View>
        ) : error ? (
          <Text style={styles.emptyActionText}>{owner('ownerDashboardLoadError')}</Text>
        ) : (
          <>
            <View style={styles.actionRow}>
              <View style={styles.actionRowIcon}>
                <Ionicons name="calendar-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionName}>{language === 'ko' ? '예약 요청' : 'Reservation requests'}</Text>
                <Text style={styles.actionDescription}>
                  {language === 'ko'
                    ? `${data.pendingReservationCount}건의 예약이 응답을 기다리고 있습니다.`
                    : `${data.pendingReservationCount} reservation(s) waiting for a response.`}
                </Text>
              </View>
              <Text style={styles.actionCount}>{data.pendingReservationCount}</Text>
            </View>
            {attentionApplications.map((application) => (
              <View key={application.id} style={styles.actionRow}>
                <View style={styles.actionRowIcon}>
                  <Ionicons name="document-text-outline" size={18} color={ACCENT} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionName}>
                    {application.restaurantName || application.businessName || owner('ownerDashboardBusinessApplication')}
                  </Text>
                  <Text style={styles.actionDescription}>
                    {owner(statusTranslationKey(application.status))}
                    {application.updatedAt ? ` · ${dateLabel(application.updatedAt)}` : ''}
                  </Text>
                  {application.reviewMessage ? <Text style={styles.reviewMessage}>{application.reviewMessage}</Text> : null}
                </View>
              </View>
            ))}
            {!loading && data.pendingReservationCount === 0 && attentionApplications.length === 0 ? (
              <Text style={styles.emptyActionText}>
                {language === 'ko' ? '현재 확인이 필요한 항목이 없습니다.' : 'You are all caught up. There are no pending actions.'}
              </Text>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.activityCard}>
        <Text style={styles.sectionTitle}>{language === 'ko' ? '최근 신청 활동' : 'Recent Application Activity'}</Text>
        {previewMode ? (
          <Text style={styles.emptyActionText}>{language === 'ko' ? '미리보기에서는 계정별 신청 활동을 표시하지 않습니다.' : 'Account-specific application activity is not shown in preview.'}</Text>
        ) : summary.recentApplications.length === 0 ? (
          <Text style={styles.emptyActionText}>{owner('ownerDashboardNoApplications')}</Text>
        ) : (
          summary.recentApplications.slice(0, 3).map((application) => (
            <View key={application.id} style={styles.activityRow}>
              <View style={styles.activityDot} />
              <View style={styles.actionCopy}>
                <Text style={styles.actionName}>
                  {application.restaurantName || application.businessName || owner('ownerDashboardBusinessApplication')}
                </Text>
                <Text style={styles.actionDescription}>
                  {owner(statusTranslationKey(application.status))}
                  {application.updatedAt ? ` · ${dateLabel(application.updatedAt)}` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 15 },
  hero: { marginHorizontal: 16, minHeight: 190, borderRadius: 22, padding: 20, justifyContent: 'center', overflow: 'hidden', backgroundColor: '#24211F' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroEyebrow: { color: '#FFD0B4', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  previewBadge: { backgroundColor: ACCENT, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  previewBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 17 },
  heroSubtitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginTop: 5 },
  heroAccent: { position: 'absolute', width: 150, height: 150, borderRadius: 75, right: -60, top: -65, backgroundColor: '#F26A21', opacity: 0.9 },
  sectionHeading: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingCopy: { gap: 3 },
  sectionTitle: { color: OwnerPortalColors.ink, fontSize: 16, fontWeight: '900' },
  sectionSubtitle: { color: OwnerPortalColors.muted, fontSize: 11 },
  periodRow: { paddingHorizontal: 16, flexDirection: 'row', gap: 8 },
  periodButton: { flex: 1, borderRadius: 20, paddingVertical: 10, alignItems: 'center', backgroundColor: '#F2F1EF' },
  periodButtonActive: { backgroundColor: ACCENT },
  periodButtonText: { color: OwnerPortalColors.inkSoft, fontSize: 11, fontWeight: '700' },
  periodButtonTextActive: { color: '#FFFFFF' },
  periodButtonDisabled: { opacity: 0.82 },
  metricsGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', flexGrow: 1, minHeight: 120, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: OwnerPortalColors.border, padding: 13, gap: 6 },
  metricIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: OwnerPortalColors.ink, fontSize: 25, fontWeight: '900' },
  metricLabel: { color: OwnerPortalColors.inkSoft, fontSize: 11, fontWeight: '700' },
  analyticsNotice: { marginHorizontal: 16, borderRadius: 13, backgroundColor: '#FFF5EF', padding: 12, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  analyticsNoticeText: { flex: 1, color: OwnerPortalColors.inkSoft, fontSize: 11, lineHeight: 17 },
  actionCard: { marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: OwnerPortalColors.border, padding: 15, gap: 11 },
  actionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionAlertIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#FFF0E7', alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F0EDE9' },
  actionRowIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#FFF0E7', alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1 },
  actionName: { color: OwnerPortalColors.ink, fontSize: 12, fontWeight: '800' },
  actionDescription: { color: OwnerPortalColors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  actionCount: { color: ACCENT, fontSize: 17, fontWeight: '900' },
  emptyAction: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 8 },
  emptyActionText: { color: OwnerPortalColors.muted, fontSize: 11, lineHeight: 17 },
  reviewMessage: { color: '#9A4B08', fontSize: 11, marginTop: 4 },
  activityCard: { marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: OwnerPortalColors.border, padding: 15, gap: 10 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#F0EDE9', paddingTop: 10 },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT },
});
