import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { loadLocalProfile, saveProfile } from '@/data/profile-store';
import { onProfileReplaced, startSavedDataSync } from '@/data/saved-data-sync';
import { DEFAULT_PROFILE, type FoodProfile } from '@/data/types';

const ProfileContext = createContext({
  profile: DEFAULT_PROFILE,
  setProfile: (_p: FoodProfile) => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState(DEFAULT_PROFILE);
  // #4: true once the user changes the profile. If that happens before the saved profile
  // has loaded from the phone, the user's change wins and the older saved one is ignored.
  const changedByUser = useRef(false);
  // #119: true once the account's profile was loaded (or the phone was cleared at sign-out).
  // The slower phone read must not put the older profile back after that.
  const replacedBySync = useRef(false);

  useEffect(() => {
    let alive = true;

    loadLocalProfile()
      .then((saved) => {
        if (alive && saved && !changedByUser.current && !replacedBySync.current) setProfileState(saved);
      })
      .catch((error) => console.warn('Could not load the saved food profile:', error)); // keep the default

    const stopListening = onProfileReplaced((replaced) => {
      replacedBySync.current = true;
      if (alive) setProfileState(replaced);
    });
    // #119: load the email account's profile, favourites and searches; clear them at sign-out.
    const stopSync = startSavedDataSync();

    return () => {
      alive = false;
      stopListening();
      stopSync();
    };
  }, []);

  const setProfile = (p: FoodProfile) => {
    changedByUser.current = true;
    setProfileState(p);
    saveProfile(p).catch((error) => console.warn('Could not save the food profile:', error));
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
