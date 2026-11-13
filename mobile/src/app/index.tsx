import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isWelcomeAfterSignOutPending, startGuestSession } from '@/data/auth';
import { supabase } from '@/data/supabase';
import { getAppMode, setAppMode } from '@/data/app-mode';

const COLORS = {
  ink: '#202124',
  muted: '#777B83',
  coral: '#F15A3B',
  background: '#FFF9F5',
  border: '#F0E8E2',
  green: '#23845D',
};

export default function WelcomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    async function restoreMode() {
      try {
        // Do not let stale account metadata redirect the user away from
        // Welcome immediately after an intentional sign-out.
        if (await isWelcomeAfterSignOutPending()) return;
        const mode = await getAppMode();
        if (!alive || !mode) return;

        if (mode === 'business') {
          // A guest session is not a business account. Never restore a guest
          // into the Owner Portal or leave the app stuck behind owner login.
          const { data } = supabase
            ? await supabase.auth.getSession()
            : { data: { session: null } };
          const user = data.session?.user;
          if (!user || user.is_anonymous) {
            await setAppMode('user');
            if (alive) router.replace('/(tabs)');
            return;
          }
          if (alive) router.replace('/owner');
          return;
        }

        if (alive) router.replace('/(tabs)');
      } catch {
        // If preferences or auth cannot be read, show the welcome screen.
      } finally {
        if (alive) setChecking(false);
      }
    }

    void restoreMode();
    return () => {
      alive = false;
    };
  }, [router]);

  async function continueAsGuest() {
    setBusy(true);
    try {
      await startGuestSession();
      await setAppMode('user');
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(
        'Could not continue',
        error instanceof Error ? error.message : 'Please check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.coral} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.topLine}>
          <View style={styles.brandMark}>
            <Ionicons name="restaurant" size={23} color="#fff" />
          </View>
          <Text style={styles.brandName}>MUKJI</Text>
          <View style={styles.brandPill}><Text style={styles.brandPillText}>FOOD, MADE CLEAR</Text></View>
        </View>

        <View style={styles.introBlock}>
          <Text style={styles.eyebrow}>WELCOME TO MUKJI</Text>
          <Text style={styles.heading}>Good food.{ '\n' }Your way.</Text>
          <Text style={styles.intro}>Discover places and dishes that match the way you eat.</Text>
        </View>

        <Text style={styles.sectionLabel}>CHOOSE YOUR EXPERIENCE</Text>

        <Pressable
          style={styles.choiceCard}
          onPress={() => router.push('/user-login')}
          accessibilityRole="button">
          <View style={styles.choiceCopy}>
            <View style={styles.choiceIconUser}><Ionicons name="person" size={18} color={COLORS.coral} /></View>
            <Text style={styles.choiceTitle}>I&apos;m a User</Text>
            <Text style={styles.choiceDescription}>Find restaurants, check ingredients and explore food that suits you.</Text>
            <View style={styles.choiceActionRow}>
              <Text style={styles.choiceAction}>Explore MUKJI</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.coral} />
            </View>
          </View>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&auto=format&fit=crop&q=85' }}
            style={styles.choiceImage}
            resizeMode="cover"
          />
          <View style={styles.imageFade} />
        </Pressable>

        <Pressable
          style={[styles.choiceCard, styles.businessCard]}
          onPress={() => router.push('/owner-login')}
          accessibilityRole="button">
          <View style={styles.choiceCopy}>
            <View style={styles.choiceIconBusiness}><Ionicons name="storefront" size={18} color={COLORS.green} /></View>
            <Text style={styles.choiceTitle}>I&apos;m a Business Owner</Text>
            <Text style={styles.choiceDescription}>Claim your restaurant, update menus and manage your business.</Text>
            <View style={styles.choiceActionRow}>
              <Text style={[styles.choiceAction, styles.businessAction]}>Open Partners</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.green} />
            </View>
          </View>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=700&auto=format&fit=crop&q=85' }}
            style={styles.choiceImage}
            resizeMode="cover"
          />
          <View style={styles.imageFade} />
        </Pressable>

        <Pressable style={styles.guestButton} onPress={() => void continueAsGuest()} disabled={busy}>
          {busy ? <ActivityIndicator color={COLORS.ink} /> : <>
            <Text style={styles.guestText}>Continue as guest</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.ink} />
          </>}
        </Pressable>

        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={15} color={COLORS.muted} />
          <Text style={styles.footnote}>Owner tools are available after your restaurant application is approved by MUKJI.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  page: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 28 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: COLORS.coral, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: COLORS.ink, fontSize: 21, fontWeight: '900', letterSpacing: 2.5 },
  brandPill: { marginLeft: 'auto', backgroundColor: '#FCE8E1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  brandPillText: { color: COLORS.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  introBlock: { marginTop: 34, marginBottom: 25 },
  eyebrow: { color: COLORS.coral, fontSize: 11, fontWeight: '900', letterSpacing: 1.7, marginBottom: 9 },
  heading: { color: COLORS.ink, fontSize: 37, lineHeight: 41, fontWeight: '900', letterSpacing: -1.2 },
  intro: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 290 },
  sectionLabel: { color: '#96918D', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 12 },
  choiceCard: { minHeight: 166, backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 13, flexDirection: 'row', position: 'relative', elevation: 2, shadowColor: '#5B392D', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  businessCard: { backgroundColor: '#FBFFFC' },
  choiceCopy: { width: '69%', padding: 16, paddingRight: 5, zIndex: 2 },
  choiceIconUser: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#FFF0EA', alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  choiceIconBusiness: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  choiceTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '900', marginBottom: 5 },
  choiceDescription: { color: COLORS.muted, fontSize: 11, lineHeight: 16, maxWidth: 210 },
  choiceActionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 },
  choiceAction: { color: COLORS.coral, fontSize: 12, fontWeight: '900' },
  businessAction: { color: COLORS.green },
  choiceImage: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '39%', height: '100%' },
  imageFade: { position: 'absolute', right: '30%', top: 0, bottom: 0, width: 42, backgroundColor: '#FFFFFF', opacity: 0.72 },
  guestButton: { minHeight: 53, borderRadius: 16, borderWidth: 1, borderColor: '#E8DED7', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 5 },
  guestText: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 15, paddingHorizontal: 8 },
  footnote: { color: COLORS.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', flex: 1 },
});
