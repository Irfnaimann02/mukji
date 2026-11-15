import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { getAppMode, setAppMode, type AppMode } from '@/data/app-mode';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { signOutAndReturnToWelcome } from '@/logic/session-service';

// Account state and actions, shared by the compact account card on the Profile tab
// and the Account settings screen. The logic is the same as the old account-card.tsx.
export function useAccount() {
  const auth = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<AppMode>('user');

  useEffect(() => {
    let alive = true;
    getAppMode().then(async (saved) => {
      if (!alive || !auth.ready || !saved) return;
      // A guest may browse in User Mode, but cannot activate Business Mode
      // until they authenticate with an owner/business account.
      if (saved === 'business' && (auth.user === null || auth.isAnonymous)) {
        await setAppMode('user');
        if (alive) setMode('user');
        return;
      }
      setMode(saved);
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [auth.ready, auth.user, auth.isAnonymous]);

  async function switchMode() {
    if (mode === 'business') {
      await setAppMode('user');
      setMode('user');
      router.replace('/(tabs)/map');
      return;
    }
    if (auth.user === null || auth.isAnonymous) {
      // Do not mark a guest as being in Business Mode. Let them authenticate,
      // with an explicit route back to the regular app if they cancel.
      router.push('/owner-login');
      return;
    }
    await setAppMode('business');
    setMode('business');
    router.replace('/owner');
  }

  async function leaveAccount() {
    try {
      await signOutAndReturnToWelcome();
      router.replace('/');
    } catch (error) {
      Alert.alert(
        t('couldNotLogOut'),
        error instanceof Error ? error.message : t('pleaseTryAgain'),
      );
    }
  }

  const guest = auth.isAnonymous || auth.user === null;

  function confirmSignOut() {
    Alert.alert(
      t('signOutQuestion'),
      guest ? t('endGuestAndReturnWelcome') : t('signOutAndReturnWelcome'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('signOut'),
          style: 'destructive',
          onPress: () => void leaveAccount(),
        },
      ],
    );
  }

  return {
    guest,
    initial: guest ? 'G' : (auth.email?.[0]?.toUpperCase() ?? 'M'),
    displayName: guest ? t('guestAccount') : (auth.email ?? t('mukjiMember')),
    mode,
    modeLabel: mode === 'business' ? t('businessMode') : t('userMode'),
    statusLabel: guest ? t('guestStatus') : t('memberStatus'),
    switchMode,
    switchLabel: mode === 'business' ? t('switchToUserMode') : t('switchToBusinessMode'),
    switchDescription: mode === 'business' ? t('browseMukjiAsCustomer') : t('manageRestaurantWithMukji'),
    confirmSignOut,
    signOutDescription: guest ? t('endGuestSessionReturnWelcome') : t('signOutOfMukjiAccount'),
  };
}
