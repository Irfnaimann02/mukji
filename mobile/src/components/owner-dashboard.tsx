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

  const periodLabels = language === 'ko' ? ['7일', '30일', '3개월'] : ['7 Days', '30 Days', '3 Months'];

  const cards = [
    {
      label: owner('ownerPortalDashboardLinkedRestaurants'),
      value: String(restaurants.length),
      icon: 'storefront-outline' as const,
      tint: '#FFF0E7',
    },
    {
      label: owner('ownerDashboardPendingReservations'),
      value: previewMode ? '—' : String(data.pendingReservationCount),
      icon: 'calendar-outline' as const,
      tint: '#FFF0E7',
    },
    {
      label: owner('ownerPortalDashboardMenuItems'),
      value: selectedRestaurant ? String(selectedRestaurant.dishes.length) : '—',
      icon: 'restaurant-outline' as const,
      tint: '#FFF0E7',
    },
    {
      label: owner('ownerDashboardApplicationsNeedingAttention'),
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
          <Text style={styles.heroEyebrow}>{owner('ownerDashboardOverviewEyebrow')}</Text>
          {previewMode ? (
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>{owner('ownerPreviewBadge')}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.heroTitle}>
          {owner('ownerDashboardGreeting')}
        </Text>
        <Text style={styles.heroSubtitle}>
          {selectedRestaurant?.nameEn || selectedRestaurant?.nameKo || owner('ownerDashboardOverviewFallback')}
        </Text>
        <View style={styles.heroAccent} />
      </View>

      <View style={styles.sectionHeading}>
        <View style={styles.headingCopy}>
          <Text style={styles.sectionTitle}>{owner('ownerDashboardBusinessInsights')}</Text>
          <Text style={styles.sectionSubtitle}>{owner('ownerDashboardPeriodSubtitle')}</Text>
        </View>
      </View>

      <View style={styles.periodRow} accessibilityLabel={owner('ownerDashboardPeriodFiltersComingSoon')}>
        {periodLabels.map((label) => (
          <View key={label} style={[styles.periodButton, styles.periodButtonDisabled]}>
            <Text style={styles.periodButtonText}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.periodComingSoon}>{owner('ownerDashboardPeriodFiltersComingSoon')}</Text>

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
{owner('ownerDashboardAnalyticsNotice')}
        </Text>
      </View>

      <View style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <View style={styles.actionTitleGroup}>
            <View style={styles.actionAlertIcon}>
              <Ionicons name="alert-circle" size={19} color={ACCENT} />
            </View>
            <Text style={styles.sectionTitle}>{owner('ownerPortalDashboardActionRequired')}</Text>
          </View>
          {loading ? <ActivityIndicator size="small" color={ACCENT} /> : null}
        </View>

        {previewMode ? (
          <View style={styles.emptyAction}>
            <Ionicons name="lock-closed-outline" size={20} color={OwnerPortalColors.muted} />
            <Text style={styles.emptyActionText}>
{owner('ownerDashboardPreviewPrivateNotice')}
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
                <Text style={styles.actionName}>{owner('ownerPortalDashboardReservationRequests')}</Text>
                <Text style={styles.actionDescription}>
{owner('ownerDashboardReservationsWaiting').replace('{count}', String(data.pendingReservationCount))}
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
                {owner('ownerDashboardNoPendingActions')}
              </Text>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.activityCard}>
        <Text style={styles.sectionTitle}>{owner('ownerDashboardRecentApplicationActivity')}</Text>
        {previewMode ? (
          <Text style={styles.emptyActionText}>{owner('ownerDashboardPreviewActivityHidden')}</Text>
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
  periodButtonText: { color: OwnerPortalColors.inkSoft, fontSize: 11, fontWeight: '700' },
  periodButtonDisabled: { opacity: 0.62 },
  periodComingSoon: { marginTop: -7, paddingHorizontal: 18, color: OwnerPortalColors.muted, fontSize: 10, textAlign: 'right' },
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
