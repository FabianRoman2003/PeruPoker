import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = '@perupoker_users';
const CURRENT_KEY = '@perupoker_current_user';

export interface User {
  username: string;
  passHash: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

// Hash simple (no es seguridad bancaria; suficiente para un login casero local)
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

export async function getUsers(): Promise<User[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? (JSON.parse(raw) as User[]) : [];
}

export async function register(username: string, password: string): Promise<AuthResult> {
  username = username.trim();
  if (!username || !password) return { ok: false, error: 'Escribe usuario y contraseña' };
  if (password.length < 3) return { ok: false, error: 'La contraseña es muy corta' };
  const users = await getUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, error: 'Ese usuario ya existe' };
  }
  users.push({ username, passHash: hash(password) });
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  await AsyncStorage.setItem(CURRENT_KEY, username);
  return { ok: true };
}

export async function login(username: string, password: string): Promise<AuthResult> {
  username = username.trim();
  const users = await getUsers();
  const u = users.find(x => x.username.toLowerCase() === username.toLowerCase());
  if (!u || u.passHash !== hash(password)) {
    return { ok: false, error: 'Usuario o contraseña incorrectos' };
  }
  await AsyncStorage.setItem(CURRENT_KEY, u.username);
  return { ok: true };
}

export async function getCurrentUser(): Promise<string | null> {
  return AsyncStorage.getItem(CURRENT_KEY);
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(CURRENT_KEY);
}
