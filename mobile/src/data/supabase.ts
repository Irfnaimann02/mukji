import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// null when mobile/.env is missing, so the app can fall back to mock data
// instead of crashing on a teammate's laptop.
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage, // #45: keep the login after the app is closed
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false, // phone app, no web redirects
        },
      })
    : null;

// Refresh the login token only while the app is open
// (Supabase's recommended setup for React Native).
const client = supabase;
if (client && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
}
