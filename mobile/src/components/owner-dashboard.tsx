import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from 'react-native';

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
      value: previewMode ? '1' : String(summary.pendingApplications),
      icon: 'document-text-outline' as const,
    },
    {
      label: owner('ownerDashboardReservationRequests'),
      value: previewMode ? '8' : String(data.pendingReservationCount),
      icon: 'calendar-outline' as const,
    },
    {
      label: owner('ownerDashboardDraftApplications'),
      value: previewMode ? '3' : String(summary.drafts),
      icon: 'create-outline' as const,
    },
  ];

  return (
    <View style={styles.root}>
      <ImageBackground
        source={{ uri: selectedRestaurant?.featuredDishImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=85' }}
        imageStyle={styles.heroImage}
        style={styles.hero}>
        <View style={styles.heroShade}>
          <Text style={styles.heroEyebrow}>MUKJI OWNER · {previewMode ? 'PRESENTATION PREVIEW' : 'BUSINESS OVERVIEW'}</Text>
          <Text style={styles.heroTitle}>{owner('ownerDashboardWelcome')}</Text>
          <Text style={styles.heroSubtitle}>{selectedRestaurant?.nameEn || owner('ownerDashboardOverviewDescription')}</Text>
          {previewMode ? <View style={styles.heroTag}><Text style={styles.heroTagText}>DEMO DATA · NOT LIVE</Text></View> : null}
        </View>
      </ImageBackground>
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <Ionicons name="grid-outline" size={22} color={ACCENT} />
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
            <Ionicons name={card.icon} size={20} color={ACCENT} />
            <Text style={styles.statNumber}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {previewMode ? (
        <View style={styles.analyticsCard}>
          <View style={styles.sectionHeader}>
            <View><Text style={styles.sectionTitle}>Restaurant activity</Text><Text style={styles.muted}>Illustrative weekly trend</Text></View>
            <View style={styles.periodPill}><Text style={styles.periodText}>7 DAYS</Text></View>
          </View>
          <View style={styles.chart}>
            {[34, 48, 42, 66, 55, 78, 91].map((height, index) => (
              <View key={index} style={styles.chartColumn}>
                <View style={[styles.chartBar, { height }]} />
                <Text style={styles.chartDay}>{['M','T','W','T','F','S','S'][index]}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartLegend}><View style={styles.legendDot} /><Text style={styles.muted}>Sample reservation activity · preview only</Text></View>
        </View>
      ) : (
        <View style={styles.infoCard}>
          <Ionicons name="analytics-outline" size={20} color={ACCENT} />
          <Text style={styles.infoText}>Performance analytics will appear here when verified booking and sales data are available.</Text>
        </View>
      )}

      {previewMode ? (
        <View style={styles.analyticsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Action required</Text>
            <View style={styles.periodPill}><Text style={styles.periodText}>2 ITEMS</Text></View>
          </View>
          <View style={styles.actionRow}>
            <View style={styles.actionIcon}><Ionicons name="calendar-outline" size={19} color={ACCENT} /></View>
            <View style={styles.flex}><Text style={styles.applicationName}>Respond to 2 reservation requests</Text><Text style={styles.muted}>Customers are waiting for confirmation</Text></View>
            <Ionicons name="chevron-forward" size={18} color="#858585" />
          </View>
          <View style={styles.actionRow}>
            <View style={styles.actionIcon}><Ionicons name="restaurant-outline" size={19} color={ACCENT} /></View>
            <View style={styles.flex}><Text style={styles.applicationName}>Review menu availability</Text><Text style={styles.muted}>Keep today&apos;s menu up to date</Text></View>
            <Ionicons name="chevron-forward" size={18} color="#858585" />
          </View>
        </View>
      ) : null}

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
          {loading ? <ActivityIndicator size="small" color={ACCENT} /> : null}
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
        <Ionicons name="information-circle-outline" size={20} color={ACCENT} />
        <Text style={styles.infoText}>{owner('ownerDashboardAvailabilityNote')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  hero: { minHeight: 190, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#30251F' },
  heroImage: { borderRadius: 20 },
  heroShade: { minHeight: 190, padding: 18, justifyContent: 'flex-end', backgroundColor: 'rgba(20,16,13,0.48)' },
  heroEyebrow: { color: '#FFD0B4', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  heroTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 8 },
  heroSubtitle: { color: '#FFFFFF', fontSize: 14, marginTop: 4, fontWeight: '600' },
  heroTag: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: ACCENT },
  heroTagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  analyticsCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E9E5E1', padding: 15, gap: 12 },
  periodPill: { backgroundColor: '#FFF0E7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  periodText: { color: ACCENT, fontSize: 10, fontWeight: '900' },
  chart: { height: 118, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#EEE9E5' },
  chartColumn: { alignItems: 'center', justifyContent: 'flex-end', gap: 6, flex: 1, height: '100%' },
  chartBar: { width: 18, maxHeight: 92, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: ACCENT },
  chartDay: { color: '#858585', fontSize: 10, fontWeight: '700' },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F0EDE9' },
  actionIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#FFF0E7', alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 18 },
  headingIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0E7', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: ACCENT, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#171717', fontSize: 22, fontWeight: '800', marginTop: 2 },
  subtitle: { color: '#6F6A66', fontSize: 13, marginTop: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 112, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E9E5E1', padding: 14, gap: 5 },
  statNumber: { color: '#171717', fontSize: 25, fontWeight: '800' },
  statLabel: { color: '#6F6A66', fontSize: 12, fontWeight: '600' },
  card: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E9E5E1', padding: 15, gap: 10 },
  selectedCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E9E5E1', padding: 15, gap: 7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#171717', fontSize: 15, fontWeight: '800' },
  restaurantName: { color: '#171717', fontSize: 18, fontWeight: '700' },
  muted: { color: '#858585', fontSize: 12, lineHeight: 18 },
  selectedMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metaText: { color: '#65412D', fontSize: 12, fontWeight: '600' },
  footnote: { color: '#858585', fontSize: 11, lineHeight: 16 },
  applicationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0EDE9' },
  applicationName: { color: '#282421', fontSize: 13, fontWeight: '700' },
  statusPill: { backgroundColor: '#FFF0E7', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, maxWidth: 125 },
  statusNeedsInfo: { backgroundColor: '#fff1dc' },
  statusRejected: { backgroundColor: '#fdebea' },
  statusText: { color: '#65412D', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  reviewMessage: { color: '#9a4b08', fontSize: 12, marginTop: 5 },
  attentionCard: { marginHorizontal: 16, padding: 13, backgroundColor: '#fff8eb', borderColor: '#f2d7ad', borderWidth: 1, borderRadius: 12, flexDirection: 'row', gap: 10 },
  attentionTitle: { color: '#7c3e08', fontWeight: '800', fontSize: 13 },
  attentionText: { color: '#855a2b', fontSize: 12, lineHeight: 17, marginTop: 3 },
  infoCard: { marginHorizontal: 16, padding: 13, backgroundColor: '#FFF6F0', borderRadius: 12, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  infoText: { flex: 1, color: '#65412D', fontSize: 11, lineHeight: 16 },
});
