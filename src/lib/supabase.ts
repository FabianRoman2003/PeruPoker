import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Proyecto Supabase de PeruPoker. La clave publishable es PÚBLICA (segura en el cliente).
// NUNCA poner aquí la clave secreta (sb_secret_...).
export const SUPABASE_URL = 'https://rfxvzbeolephwcckexaa.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_ytvlTPteaSEVRvbFf1vp1A_CTRMJvjJ';

export const supabaseConfigurado =
  !SUPABASE_URL.includes('TU-PROYECTO') && !SUPABASE_ANON_KEY.includes('TU_ANON_KEY');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
