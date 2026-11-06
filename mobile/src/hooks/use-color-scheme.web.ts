import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Keep the server-rendered theme light until the client hydrates.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}