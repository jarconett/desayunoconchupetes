import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Solo el dominio del proyecto: si se copió el "RESTful endpoint" (…/rest/v1/)
// o lleva barra final, Supabase responde "Invalid path specified in request URL".
const limpiar = (v?: string) => (v ?? '').trim().replace(/^["']|["']$/g, '');
const url = limpiar(process.env.EXPO_PUBLIC_SUPABASE_URL).replace(/^(https?:\/\/[^/?#\s]+).*$/, '$1');
const anonKey = limpiar(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || 'https://example.supabase.co', anonKey || 'public-anon-key', {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// En móvil, refrescamos el token solo con la app en primer plano
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Lanza el error de Supabase si existe y devuelve los datos tipados. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
