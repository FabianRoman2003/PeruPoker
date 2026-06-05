import React, { useState } from 'react';
import {
  Modal,
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

export default function CajaScreen() {
  const { state, addPlayer, addBuyin, removeBuyin } = useSession();
  const { players, boxValue } = state;
  const [newName, setNewName] = useState('');
  const [cierreVisible, setCierreVisible] = useState(false);

  const cajas = players.reduce((s, p) => s + p.buyins, 0);
  const dinero = totalMoney(players, boxValue);

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>DINERO EN MESA</Text>
        <Text style={styles.bannerValue}>{dinero} Bs</Text>
        <Text style={styles.bannerSub}>{cajas} cajas · {boxValue} Bs c/u</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {players.map(p => (
          <View key={p.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.sub}>
                {p.buyins} cajas · {p.buyins * boxValue} Bs
              </Text>
            </View>
            <TouchableOpacity style={styles.minus} onPress={() => removeBuyin(p.id)}>
              <Text style={styles.minusText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.plus} onPress={() => addBuyin(p.id)}>
              <Text style={styles.plusText}>+{boxValue}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {players.length < 9 && (
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="Nombre del jugador…"
              placeholderTextColor={colors.textDim}
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={() => {
                addPlayer(newName);
                setNewName('');
              }}
            />
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                addPlayer(newName);
                setNewName('');
              }}>
              <Text style={styles.addBtnText}>Añadir</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.cerrarBtn} onPress={() => setCierreVisible(true)}>
        <Text style={styles.cerrarText}>Cerrar mesa y cuadrar 🧮</Text>
      </TouchableOpacity>

      <CierreModal visible={cierreVisible} onClose={() => setCierreVisible(false)} />
    </View>
  );
}

function CierreModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, setCashout, resetCashouts } = useSession();
  const { players, boxValue } = state;
  const desc = mismatch(players, boxValue);
  const todosContados = players.every(p => p.cashout != null);
  const cuadra = todosContados && desc === 0;
  const txs = cuadra ? settle(players, boxValue) : [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Cierre de mesa</Text>
          <Text style={styles.modalHint}>Cuenta las fichas finales de cada jugador (en Bs):</Text>

          <ScrollView style={{ maxHeight: 280 }}>
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

          {/* Candado del cuadre */}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 14 },
  banner: {
    backgroundColor: colors.felt,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  bannerLabel: { color: '#CDEBDD', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  bannerValue: { color: '#fff', fontSize: 40, fontWeight: '900' },
  bannerSub: { color: '#CDEBDD', fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sub: { color: colors.textDim, fontSize: 13 },
  minus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  minusText: { color: colors.textDim, fontSize: 24, fontWeight: '800' },
  plus: {
    minWidth: 64,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  plusText: { color: '#06301E', fontSize: 18, fontWeight: '900' },
  addRow: { flexDirection: 'row', marginTop: 6, gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtn: {
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: { color: colors.text, fontWeight: '700' },
  cerrarBtn: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  cerrarText: { color: '#3A2D00', fontSize: 17, fontWeight: '900' },
  // modal
  modalBg: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  modalHint: { color: colors.textDim, marginBottom: 10 },
  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  cashInput: {
    width: 90,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    textAlign: 'right',
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  warn: { color: colors.red, fontWeight: '800', marginTop: 12, fontSize: 15 },
  ok: { color: colors.green, fontWeight: '800', marginTop: 12, fontSize: 15 },
  txBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  txTitle: { color: colors.text, fontWeight: '800', marginBottom: 6 },
  txLine: { color: colors.text, fontSize: 15, paddingVertical: 3 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  ghostBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostText: { color: colors.textDim, fontWeight: '700' },
  closeBtn: {
    flex: 2,
    backgroundColor: colors.green,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  closeText: { color: '#06301E', fontWeight: '900', fontSize: 16 },
});
