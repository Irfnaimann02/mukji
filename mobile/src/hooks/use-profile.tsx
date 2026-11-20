import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { DEFAULT_PROFILE, type FoodProfile } from '@/data/types';

const KEY = 'foodProfile';

const ProfileContext = createContext({
  profile: DEFAULT_PROFILE,
  setProfile: (_p: FoodProfile) => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState(DEFAULT_PROFILE);
  // #4: true once the user changes the profile. If that happens before the saved profile
  // has loaded from the phone, the user's change wins and the older saved one is ignored.
  const changedByUser = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved && !changedByUser.current) setProfileState({ ...DEFAULT_PROFILE, ...JSON.parse(saved) });
      })
      .catch((error) => console.warn('Could not load the saved food profile:', error)); // keep the default
  }, []);

  const setProfile = (p: FoodProfile) => {
    changedByUser.current = true;
    setProfileState(p);
    AsyncStorage.setItem(KEY, JSON.stringify(p)).catch((error) =>
      console.warn('Could not save the food profile:', error),
    );
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
