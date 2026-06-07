import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const CURRENT_KEY = '@perupoker_current_user';

export interface AuthResult {
  ok: boolean;
  error?: string;
}

function mapError(code: string): string {
  switch (code) {
    case 'error:datos':
      return 'Escribe usuario y contraseña (mín. 3 caracteres)';
    case 'error:existe':
      return 'Ese usuario ya existe, elige otro';
    case 'error:credenciales':
      return 'Usuario o contraseña incorrectos';
    default:
      return 'No se pudo conectar. Revisa tu internet.';
  }
}

export async function register(username: string, password: string): Promise<AuthResult> {
  const u = username.trim();
  if (!u || password.length < 3) {
    return { ok: false, error: 'Escribe usuario y contraseña (mín. 3 caracteres)' };
  }
  const { data, error } = await supabase.rpc('register_user', { p_username: u, p_password: password });
  if (error) return { ok: false, error: 'No se pudo conectar. Revisa tu internet.' };
  if (data === 'ok') {
    await AsyncStorage.setItem(CURRENT_KEY, u);
    return { ok: true };
  }
  return { ok: false, error: mapError(String(data)) };
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const u = username.trim();
  if (!u || !password) {
    return { ok: false, error: 'Escribe usuario y contraseña' };
  }
  const { data, error } = await supabase.rpc('login_user', { p_username: u, p_password: password });
  if (error) return { ok: false, error: 'No se pudo conectar. Revisa tu internet.' };
  if (data === 'ok') {
    await AsyncStorage.setItem(CURRENT_KEY, u);
    return { ok: true };
  }
  return { ok: false, error: mapError(String(data)) };
}

export async function getCurrentUser(): Promise<string | null> {
  return AsyncStorage.getItem(CURRENT_KEY);
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(CURRENT_KEY);
}
