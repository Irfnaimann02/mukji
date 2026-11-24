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

const BLUE = '#1b5fad';
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

  const statCards = [
    {
      label: owner('ownerDashboardLinkedRestaurants'),
      value: String(restaurants.length),
      icon: 'storefront-outline' as const,
    },
    {
      label: owner('ownerDashboardPendingApplications'),
      value: previewMode ? '—' : String(summary.pendingApplications),
      icon: 'document-text-outline' as const,
    },
    {
      label: owner('ownerDashboardReservationRequests'),
      value: previewMode ? '—' : String(data.pendingReservationCount),
      icon: 'calendar-outline' as const,
    },
    {
      label: owner('ownerDashboardDraftApplications'),
      value: previewMode ? '—' : String(summary.drafts),
      icon: 'create-outline' as const,
    },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <Ionicons name="grid-outline" size={22} color={BLUE} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>{owner('ownerOWNERDASHBOARD')}</Text>
          <Text style={styles.title}>{owner('ownerDashboardWelcome')}</Text>
          <Text style={styles.subtitle}>{owner('ownerDashboardOverviewDescription')}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {statCards.map((card) => (
          <View key={card.label} style={styles.statCard}>
            <Ionicons name={card.icon} size={20} color={BLUE} />
            <Text style={styles.statNumber}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {selectedRestaurant ? (
        <View style={styles.selectedCard}>
          <Text style={styles.sectionTitle}>{owner('ownerDashboardSelectedRestaurant')}</Text>
          <Text style={styles.restaurantName}>{selectedRestaurant.nameEn || selectedRestaurant.nameKo}</Text>
          <Text style={styles.muted}>{selectedRestaurant.address}</Text>
          <View style={styles.selectedMeta}>
            <Text style={styles.metaText}>
              {owner('ownerDashboardMenuItems', { count: selectedRestaurant.dishes.length })}
            </Text>
            <Text style={styles.metaText}>
              {selectedRestaurant.halalCertified
                ? owner('ownerMarkedAsCertified')
                : owner('ownerNotMarkedAsCertified')}
            </Text>
          </View>
          <Text style={styles.footnote}>{owner('ownerDashboardCertificationNote')}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{owner('ownerDashboardApplicationStatus')}</Text>
          {loading ? <ActivityIndicator size="small" color={BLUE} /> : null}
        </View>
        {previewMode ? (
          <Text style={styles.muted}>{owner('ownerDashboardPreviewDataUnavailable')}</Text>
        ) : error ? (
          <Text style={styles.muted}>{owner('ownerDashboardLoadError')}</Text>
        ) : summary.recentApplications.length === 0 ? (
          <Text style={styles.muted}>{owner('ownerDashboardNoApplications')}</Text>
        ) : (
          summary.recentApplications.map((application) => (
            <View key={application.id} style={styles.applicationRow}>
              <View style={styles.flex}>
                <Text style={styles.applicationName}>
                  {application.restaurantName || application.businessName || owner('ownerDashboardBusinessApplication')}
                </Text>
                <Text style={styles.muted}>
                  {application.kind === 'claim'
                    ? owner('ownerRestaurantApplicationClaim')
                    : application.kind === 'new'
                      ? owner('ownerRestaurantApplicationNew')
                      : owner('ownerDashboardBusinessInformation')}
                  {application.updatedAt ? ` · ${dateLabel(application.updatedAt)}` : ''}
                </Text>
                {application.status === 'needs_information' && application.reviewMessage ? (
                  <Text style={styles.reviewMessage}>{application.reviewMessage}</Text>
                ) : null}
              </View>
              <View style={[styles.statusPill, application.status === 'needs_information' && styles.statusNeedsInfo, application.status === 'rejected' && styles.statusRejected]}>
                <Text style={styles.statusText}>{owner(statusTranslationKey(application.status))}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {summary.needsInformation > 0 ? (
        <View style={styles.attentionCard}>
          <Ionicons name="alert-circle-outline" size={21} color="#9a4b08" />
          <View style={styles.flex}>
            <Text style={styles.attentionTitle}>
              {owner('ownerDashboardNeedsInformation', { count: summary.needsInformation })}
            </Text>
            <Text style={styles.attentionText}>{owner('ownerDashboardNeedsInformationHelp')}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={BLUE} />
        <Text style={styles.infoText}>{owner('ownerDashboardAvailabilityNote')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  flex: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 18 },
  headingIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#eaf2fc', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: BLUE, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#14213d', fontSize: 22, fontWeight: '800', marginTop: 2 },
  subtitle: { color: '#6b7a8d', fontSize: 13, marginTop: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 112, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4eaf1', padding: 14, gap: 5 },
  statNumber: { color: '#14213d', fontSize: 25, fontWeight: '800' },
  statLabel: { color: '#68788c', fontSize: 12, fontWeight: '600' },
  card: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4eaf1', padding: 15, gap: 10 },
  selectedCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4eaf1', padding: 15, gap: 7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#14213d', fontSize: 15, fontWeight: '800' },
  restaurantName: { color: '#14213d', fontSize: 18, fontWeight: '700' },
  muted: { color: '#718096', fontSize: 12, lineHeight: 18 },
  selectedMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metaText: { color: '#43546a', fontSize: 12, fontWeight: '600' },
  footnote: { color: '#718096', fontSize: 11, lineHeight: 16 },
  applicationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#edf1f5' },
  applicationName: { color: '#23344d', fontSize: 13, fontWeight: '700' },
  statusPill: { backgroundColor: '#edf3fa', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, maxWidth: 125 },
  statusNeedsInfo: { backgroundColor: '#fff1dc' },
  statusRejected: { backgroundColor: '#fdebea' },
  statusText: { color: '#40546d', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  reviewMessage: { color: '#9a4b08', fontSize: 12, marginTop: 5 },
  attentionCard: { marginHorizontal: 16, padding: 13, backgroundColor: '#fff8eb', borderColor: '#f2d7ad', borderWidth: 1, borderRadius: 12, flexDirection: 'row', gap: 10 },
  attentionTitle: { color: '#7c3e08', fontWeight: '800', fontSize: 13 },
  attentionText: { color: '#855a2b', fontSize: 12, lineHeight: 17, marginTop: 3 },
  infoCard: { marginHorizontal: 16, padding: 13, backgroundColor: '#eef5fd', borderRadius: 12, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  infoText: { flex: 1, color: '#405b7c', fontSize: 11, lineHeight: 16 },
});
