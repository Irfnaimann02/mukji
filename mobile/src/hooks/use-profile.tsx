import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { DEFAULT_PROFILE, type FoodProfile } from '@/data/types';

const KEY = 'foodProfile';

const ProfileContext = createContext({
  profile: DEFAULT_PROFILE,
  setProfile: (_p: FoodProfile) => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState(DEFAULT_PROFILE);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((saved) => {
      if (saved) setProfileState({ ...DEFAULT_PROFILE, ...JSON.parse(saved) });
    });
  }, []);

  const setProfile = (p: FoodProfile) => {
    setProfileState(p);
    AsyncStorage.setItem(KEY, JSON.stringify(p));
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
