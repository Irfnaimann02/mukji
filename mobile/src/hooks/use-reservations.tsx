import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const KEY = 'contactedRestaurants';

type Value = {
  contactedIds: string[]; // newest first
  markContacted: (id: string) => void;
};

const ReservationContext = createContext<Value>({
  contactedIds: [],
  markContacted: () => {},
});

// Remembers which restaurants the user pressed Call on. Saved on the phone, like the food profile.
export function ReservationProvider({ children }: { children: ReactNode }) {
  const [contactedIds, setContactedIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved) setContactedIds(JSON.parse(saved));
      })
      .catch(() => {});
  }, []);

  const markContacted = (id: string) => {
    const next = [id, ...contactedIds.filter((x) => x !== id)];
    setContactedIds(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  return (
    <ReservationContext.Provider value={{ contactedIds, markContacted }}>
      {children}
    </ReservationContext.Provider>
  );
}

export const useReservations = () => useContext(ReservationContext);