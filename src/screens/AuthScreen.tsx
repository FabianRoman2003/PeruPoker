import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../store/AuthContext';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    const r = mode === 'login' ? await login(username, password) : await register(username, password);
    setBusy(false);
    if (!r.ok) setError(r.error ?? 'Ocurrió un error');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.logo}>🎰</Text>
      <Text style={styles.title}>PeruPoker</Text>
      <Text style={styles.sub}>{mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Usuario"
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor={colors.textDim}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.btn} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#3A2D00" />
        ) : (
          <Text style={styles.btnText}>{mode === 'login' ? 'Entrar' : 'Registrarme'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}>
        <Text style={styles.switch}>
          {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 64 },
  title: { color: colors.text, fontSize: 38, fontWeight: '900', marginTop: 6 },
  sub: { color: colors.textDim, fontSize: 16, marginBottom: 28 },
  input: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.red, fontWeight: '700', marginBottom: 10, alignSelf: 'stretch' },
  btn: {
    alignSelf: 'stretch',
    backgroundColor: colors.gold,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#3A2D00', fontSize: 18, fontWeight: '900' },
  switch: { color: colors.blue, fontSize: 15, marginTop: 22, fontWeight: '700' },
});
