import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { useSession } from '../store/SessionContext';
import { mismatch, settle, totalMoney } from '../logic/settlement';
import { APP_VERSION } from '../version';

export default function CajaScreen() {
  const { state, online, addPlayer, addBuyin, removeBuyin, clearTable, createRoom, joinRoom, leaveRoom } =
    useSession();
  const { players, boxValue } = state;
  const [newName, setNewName] = useState('');
  const [cierreVisible, setCierreVisible] = useState(false);
  const [joinVisible, setJoinVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const viewer = online.role === 'viewer';
  const cajas = players.reduce((s, p) => s + p.buyins, 0);
  const dinero = totalMoney(players, boxValue);

  const add = () => {
    addPlayer(newName);
    setNewName('');
  };

  const vaciar = () =>
    Alert.alert('Vaciar mesa', 'Quita a todos los jugadores y reinicia el dinero. ¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: clearTable },
    ]);

  const compartir = async () => {
    setBusy(true);
    const code = await createRoom();
    setBusy(false);
    if (code) {
      Alert.alert('¡Mesa en vivo!', `Comparte este código con tus amigos:\n\n${code}\n\nQue lo pongan en "Unirse".`);
    } else {
      Alert.alert('Error', 'No se pudo crear la sala. Revisa tu internet.');
    }
  };

  const unirse = async () => {
    setJoinErr(null);
    setBusy(true);
    const r = await joinRoom(joinCode);
    setBusy(false);
    if (r.ok) {
      setJoinVisible(false);
      setJoinCode('');
    } else {
      setJoinErr(r.error ?? 'Error');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Barra de sala en vivo */}
      {online.role === 'off' ? (
        <View style={styles.roomRow}>
          <TouchableOpacity style={styles.roomBtn} disabled={busy} onPress={compartir}>
            <Text style={styles.roomBtnText}>📡 Compartir mesa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roomBtnAlt} disabled={busy} onPress={() => setJoinVisible(true)}>
            <Text style={styles.roomBtnAltText}>🔗 Unirse</Text>
          </TouchableOpacity>
        </View>
      ) : online.role === 'host' ? (
        <View style={[styles.liveBar, { borderColor: colors.green }]}>
          <Text style={styles.liveText}>📡 EN VIVO · Sala {online.code}</Text>
          <TouchableOpacity onPress={leaveRoom}>
            <Text style={styles.liveStop}>Detener</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.liveBar, { borderColor: colors.blue }]}>
          <Text style={styles.liveText}>👁 Viendo {online.code}</Text>
          <TouchableOpacity onPress={leaveRoom}>
            <Text style={styles.liveStop}>Salir</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>DINERO EN MESA</Text>
        <Text style={styles.bannerValue}>{dinero} Bs</Text>
        <Text style={styles.bannerSub}>
          {cajas} cajas · {boxValue} Bs c/u
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {players.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🪑</Text>
            <Text style={styles.emptyTitle}>{viewer ? 'Esperando al host…' : 'Mesa vacía'}</Text>
            {!viewer && (
              <Text style={styles.emptyText}>Escribe el nombre de un jugador abajo y toca "Añadir" para empezar.</Text>
            )}
          </View>
        )}

        {players.map(p => (
          <View key={p.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.sub}>
                {p.buyins} cajas · {p.buyins * boxValue} Bs
              </Text>
            </View>
            {!viewer && (
              <>
                <TouchableOpacity style={styles.minus} onPress={() => removeBuyin(p.id)}>
                  <Text style={styles.minusText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.plus} onPress={() => addBuyin(p.id)}>
                  <Text style={styles.plusText}>+{boxValue}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ))}

        {!viewer && players.length < 9 && (
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="Nombre del jugador…"
              placeholderTextColor={colors.textDim}
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={add}
            />
            <TouchableOpacity style={styles.addBtn} onPress={add}>
              <Text style={styles.addBtnText}>Añadir</Text>
            </TouchableOpacity>
          </View>
        )}

        {!viewer && players.length > 0 && (
          <TouchableOpacity style={styles.vaciarBtn} onPress={vaciar}>
            <Text style={styles.vaciarText}>🗑️ Vaciar mesa (empezar de cero)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {!viewer && (
        <TouchableOpacity style={styles.cerrarBtn} onPress={() => setCierreVisible(true)}>
          <Text style={styles.cerrarText}>Cerrar mesa y cuadrar 🧮</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.version}>PeruPoker {APP_VERSION}</Text>

      <CierreModal visible={cierreVisible} onClose={() => setCierreVisible(false)} />

      {/* Modal unirse a sala */}
      <Modal visible={joinVisible} transparent animationType="slide" onRequestClose={() => setJoinVisible(false)}>
        <KeyboardAvoidingView style={styles.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Unirse a una mesa</Text>
            <Text style={styles.modalHint}>Pide el código al host (ej. MESA-4821):</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="MESA-...."
              placeholderTextColor={colors.textDim}
              autoCapitalize="characters"
              value={joinCode}
              onChangeText={setJoinCode}
              onSubmitEditing={unirse}
            />
            {joinErr && <Text style={styles.warn}>{joinErr}</Text>}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setJoinVisible(false)}>
                <Text style={styles.ghostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} disabled={busy} onPress={unirse}>
                <Text style={styles.closeText}>Unirse</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function CierreModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, setCashout, resetCashouts } = useSession();
  const { players, boxValue } = state;
  const desc = mismatch(players, boxValue);
  const todosContados = players.length > 0 && players.every(p => p.cashout != null);
  const cuadra = todosContados && desc === 0;
  const txs = cuadra ? settle(players, boxValue) : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Cierre de mesa</Text>
          <Text style={styles.modalHint}>Cuenta las fichas finales de cada jugador (en Bs):</Text>

          <ScrollView style={{ maxHeight: 280 }} keyboardShouldPersistTaps="handled">
            {players.map(p => (
              <View key={p.id} style={styles.cashRow}>
                <Text style={[styles.name, { flex: 1 }]}>{p.name}</Text>
                <TextInput
                  style={styles.cashInput}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textDim}
                  defaultValue={p.cashout != null ? String(p.cashout) : ''}
                  onChangeText={t => setCashout(p.id, t === '' ? null : Number(t) || 0)}
                />
              </View>
            ))}
          </ScrollView>

          {!todosContados ? (
            <Text style={styles.warn}>Faltan jugadores por contar sus fichas…</Text>
          ) : desc === 0 ? (
            <Text style={styles.ok}>✓ Cuadra perfecto</Text>
          ) : (
            <Text style={styles.warn}>
              ⚠️ Descuadre: {desc > 0 ? `sobran ${desc}` : `faltan ${-desc}`} Bs — revisen el conteo
            </Text>
          )}

          {cuadra && (
            <View style={styles.txBox}>
              <Text style={styles.txTitle}>Quién le paga a quién:</Text>
              {txs.length === 0 ? (
                <Text style={styles.sub}>Nadie debe nada (todos quedaron iguales).</Text>
              ) : (
                txs.map((t, i) => (
                  <Text key={i} style={styles.txLine}>
                    💸 <Text style={{ color: colors.red }}>{t.from}</Text> paga{' '}
                    <Text style={{ color: colors.gold }}>{t.amount} Bs</Text> a{' '}
                    <Text style={{ color: colors.green }}>{t.to}</Text>
                  </Text>
                ))
              )}
            </View>
          )}

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.ghostBtn} onPress={resetCashouts}>
              <Text style={styles.ghostText}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 14 },
  roomRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  roomBtn: { flex: 1, backgroundColor: colors.felt, borderRadius: 12, padding: 12, alignItems: 'center' },
  roomBtnText: { color: '#fff', fontWeight: '800' },
  roomBtnAlt: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  roomBtnAltText: { color: colors.text, fontWeight: '800' },
  liveBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1 },
  liveText: { color: colors.text, fontWeight: '800', fontSize: 15 },
  liveStop: { color: colors.red, fontWeight: '800' },
  banner: { backgroundColor: colors.felt, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 14 },
  bannerLabel: { color: '#CDEBDD', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  bannerValue: { color: '#fff', fontSize: 40, fontWeight: '900' },
  bannerSub: { color: '#CDEBDD', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 8 },
  emptyText: { color: colors.textDim, fontSize: 14, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sub: { color: colors.textDim, fontSize: 13 },
  minus: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardLight, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  minusText: { color: colors.textDim, fontSize: 24, fontWeight: '800' },
  plus: { minWidth: 64, height: 44, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  plusText: { color: '#06301E', fontSize: 18, fontWeight: '900' },
  addRow: { flexDirection: 'row', marginTop: 6, gap: 8 },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, borderWidth: 1, borderColor: colors.border },
  addBtn: { backgroundColor: colors.green, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  addBtnText: { color: '#06301E', fontWeight: '900' },
  vaciarBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  vaciarText: { color: colors.red, fontWeight: '700' },
  cerrarBtn: { backgroundColor: colors.gold, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 6 },
  cerrarText: { color: '#3A2D00', fontSize: 17, fontWeight: '900' },
  version: { color: colors.textDim, fontSize: 11, textAlign: 'center', marginTop: 8 },
  modalBg: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, borderTopWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  modalHint: { color: colors.textDim, marginBottom: 10 },
  codeInput: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 2, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  cashRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border },
  cashInput: { width: 90, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: colors.text, textAlign: 'right', fontSize: 16, borderWidth: 1, borderColor: colors.border },
  warn: { color: colors.red, fontWeight: '800', marginTop: 12, fontSize: 15 },
  ok: { color: colors.green, fontWeight: '800', marginTop: 12, fontSize: 15 },
  txBox: { backgroundColor: colors.card, borderRadius: 12, padding: 12, marginTop: 12 },
  txTitle: { color: colors.text, fontWeight: '800', marginBottom: 6 },
  txLine: { color: colors.text, fontSize: 15, paddingVertical: 3 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  ghostBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  ghostText: { color: colors.textDim, fontWeight: '700' },
  closeBtn: { flex: 2, backgroundColor: colors.green, borderRadius: 12, padding: 14, alignItems: 'center' },
  closeText: { color: '#06301E', fontWeight: '900', fontSize: 16 },
});
