import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../store/AuthContext';
import { APP_VERSION } from '../version';

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
    try {
      const r =
        mode === 'login' ? await login(username, password) : await register(username, password);
      if (!r.ok) setError(r.error ?? 'Ocurrió un error');
    } catch (e) {
      setError('No se pudo procesar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.logo}>🎰</Text>
        <Text style={styles.title}>PeruPoker</Text>
        <Text style={styles.sub}>Control de caja, mesa y reloj</Text>

        {/* Selector Entrar / Crear cuenta */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.tabOn]}
            onPress={() => switchMode('login')}>
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextOn]}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'register' && styles.tabOn]}
            onPress={() => switchMode('register')}>
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextOn]}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta nueva'}
          </Text>

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
              <Text style={styles.btnText}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>{APP_VERSION}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logo: { fontSize: 60 },
  title: { color: colors.text, fontSize: 38, fontWeight: '900', marginTop: 4 },
  sub: { color: colors.textDim, fontSize: 15, marginBottom: 24 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 4,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabOn: { backgroundColor: colors.gold },
  tabText: { color: colors.textDim, fontWeight: '800', fontSize: 15 },
  tabTextOn: { color: '#3A2D00' },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.red, fontWeight: '700', marginBottom: 10 },
  btn: { backgroundColor: colors.gold, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#3A2D00', fontSize: 18, fontWeight: '900' },
  version: { color: colors.textDim, fontSize: 12, marginTop: 24 },
});
