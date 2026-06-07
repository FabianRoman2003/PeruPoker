import React, { useEffect, useRef, useState } from 'react';
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
  Vibration,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { computeRemaining, useSession } from '../store/SessionContext';
import { actionOrder, positions, STREET_NAMES } from '../logic/poker';
import { SeatStatus } from '../types';

const STATUS_COLOR: Record<SeatStatus, string> = {
  juega: colors.green,
  descansa: colors.textDim,
  solo_reparte: colors.gold,
};
const STATUS_LABEL: Record<SeatStatus, string> = {
  juega: 'Juega',
  descansa: 'Descansa',
  solo_reparte: 'Reparte',
};
const STATUSES: SeatStatus[] = ['juega', 'descansa', 'solo_reparte'];
const SEATS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PRESETS = [15, 20, 30, 45, 60];

function buzz(ms: number) {
  try {
    Vibration.vibrate(ms);
  } catch {}
}

export default function MesaScreen() {
  const {
    state,
    online,
    nextHand,
    nextTurn,
    prevTurn,
    apuesta,
    fold,
    startTimer,
    pauseTimer,
    resetTimer,
    setButton,
    setStatus,
    renamePlayer,
    removePlayer,
    moveSeat,
    addPlayer,
    setShotClock,
  } = useSession();
  const { players } = state;
  const viewer = online.role === 'viewer';
  const pos = positions(state);
  const order = actionOrder(state, state.street);
  const nameOf = (seat: number | null) => players.find(p => p.seat === seat)?.name ?? '—';

  const acting = state.actingSeat ?? order[0] ?? null;
  const actingName = nameOf(acting);
  const idx = acting == null ? -1 : order.indexOf(acting);
  const nextSeat = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  const nextLabel = nextSeat != null ? nameOf(nextSeat) : 'siguiente calle';

  // Reloj: se calcula desde el estado (marca de tiempo) y se refresca con un tick
  const [, force] = useState(0);
  useEffect(() => {
    if (!state.timerRunning) return;
    const t = setInterval(() => force(n => n + 1), 500);
    return () => clearInterval(t);
  }, [state.timerRunning, state.turnStartedAt]);

  const remaining = computeRemaining(state, Date.now());
  const danger = remaining <= 5;

  // Vibración al cruzar 5 y 0 (en todos los celulares)
  const prevRem = useRef(remaining);
  useEffect(() => {
    const p = prevRem.current;
    if (p > 5 && remaining <= 5 && remaining > 0) buzz(200);
    if (p > 0 && remaining === 0) buzz(500);
    prevRem.current = remaining;
  }, [remaining]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [customTime, setCustomTime] = useState('');
  const selected = players.find(p => p.id === selectedId) ?? null;

  const openSeat = (id: string, name: string) => {
    if (viewer) return;
    setSelectedId(id);
    setEditName(name);
  };
  const close = () => setSelectedId(null);
  const add = () => {
    addPlayer(newName);
    setNewName('');
  };
  const aplicarCustom = () => {
    const n = parseInt(customTime, 10);
    if (n && n > 0) {
      setShotClock(Math.min(n, 999));
      setCustomTime('');
    }
  };

  const N = players.length;
  const RX = 40;
  const RY = 38;
  const full = state.shotClockSeconds;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled">
        {viewer && (
          <View style={styles.viewerBar}>
            <Text style={styles.viewerText}>👁 Viendo en vivo {online.hostName ? `· mesa de ${online.hostName}` : ''} — solo el host controla</Text>
          </View>
        )}

        <View style={styles.posBar}>
          <Pos label="🔘 Dealer" name={nameOf(pos.button)} c={colors.gold} />
          <Pos label="1 Ciega" name={nameOf(pos.sb)} c={colors.blue} />
          <Pos label="2 Ciega" name={nameOf(pos.bb)} c={colors.red} />
        </View>

        <View style={styles.table}>
          <View style={styles.tableCenter}>
            <Text style={styles.streetBig}>{STREET_NAMES[state.street]}</Text>
            <Text style={styles.manoMid}>Mano #{state.handNumber}</Text>
            <Text style={styles.blindsMid}>
              {state.smallBlind}/{state.bigBlind}
            </Text>
          </View>

          {players.map((p, i) => {
            const angle = (-90 + (360 * i) / Math.max(N, 1)) * (Math.PI / 180);
            const x = 50 + RX * Math.cos(angle);
            const y = 50 + RY * Math.sin(angle);
            const isBtn = pos.button === p.seat;
            const isSb = pos.sb === p.seat;
            const isBb = pos.bb === p.seat;
            const isActing = acting === p.seat;
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={viewer ? 1 : 0.6}
                onPress={() => openSeat(p.id, p.name)}
                style={[
                  styles.seat,
                  {
                    left: `${x}%`,
                    top: `${y}%`,
                    borderColor: isActing ? colors.gold : isBtn ? colors.gold : STATUS_COLOR[p.status],
                    borderWidth: isActing ? 4 : isBtn ? 3 : 2,
                    opacity: p.status === 'descansa' || p.folded ? 0.45 : 1,
                  },
                  isActing && styles.seatActing,
                ]}>
                <View style={styles.badges}>
                  {isBtn && <Badge text="D" bg={colors.gold} fg="#3A2D00" />}
                  {isSb && <Badge text="1" bg={colors.blue} fg="#fff" />}
                  {isBb && <Badge text="2" bg={colors.red} fg="#fff" />}
                </View>
                <Text style={styles.seatName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text
                  style={[
                    styles.seatStatus,
                    {
                      color: isActing
                        ? colors.gold
                        : p.folded
                        ? colors.red
                        : p.lastAction === 'apuesta'
                        ? colors.green
                        : STATUS_COLOR[p.status],
                    },
                  ]}>
                  {isActing ? '▶ habla' : p.folded ? 'Fold' : p.lastAction === 'apuesta' ? 'Apostó' : STATUS_LABEL[p.status]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* RELOJ debajo de la mesa */}
        <View style={styles.clockCard}>
          <Text style={styles.clockStreet}>{STREET_NAMES[state.street]} · le toca a</Text>
          <Text style={styles.clockActing} numberOfLines={1}>
            {actingName}
          </Text>

          <TouchableOpacity activeOpacity={viewer ? 1 : 0.8} onPress={() => !viewer && apuesta()} style={styles.numberWrap}>
            <Text style={[styles.bigNumber, { color: danger ? colors.red : '#fff' }]}>{remaining}</Text>
            <Text style={styles.numberHint}>{viewer ? 'en vivo' : 'toca el número = Apostó y pasa'}</Text>
          </TouchableOpacity>

          <Text style={styles.sigue}>
            Sigue: <Text style={{ color: colors.gold, fontWeight: '800' }}>{nextLabel}</Text>
          </Text>

          {!viewer && (
            <>
              <View style={styles.turnRow}>
                <TouchableOpacity style={[styles.turnBtn, styles.foldBtn]} onPress={fold}>
                  <Text style={[styles.turnBtnText, { color: '#fff' }]}>❌ Fold</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.turnBtn, styles.betBtn]} onPress={apuesta}>
                  <Text style={[styles.turnBtnText, { color: '#06301E' }]}>✅ Apostó</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.undoBtn} onPress={prevTurn}>
                <Text style={styles.undoText}>◀ Turno anterior</Text>
              </TouchableOpacity>

              <View style={styles.row3}>
                <TouchableOpacity
                  style={[styles.ctrl, state.timerRunning && styles.ctrlActive]}
                  onPress={() => (state.timerRunning ? pauseTimer() : startTimer())}>
                  <Text style={styles.ctrlText}>{state.timerRunning ? '⏸  Pausar' : '▶  Iniciar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctrl} onPress={resetTimer}>
                  <Text style={styles.ctrlText}>↻  Reiniciar</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cfgLabel}>⏱️ Tiempo por jugador</Text>
              <View style={styles.presets}>
                {PRESETS.map(s => {
                  const on = full === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.preset, on && styles.presetOn]}
                      onPress={() => setShotClock(s)}>
                      <Text style={[styles.presetText, on && { color: '#3A2D00' }]}>{s}s</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  keyboardType="number-pad"
                  placeholder="Personalizado (seg)"
                  placeholderTextColor={colors.textDim}
                  value={customTime}
                  onChangeText={setCustomTime}
                  onSubmitEditing={aplicarCustom}
                />
                <TouchableOpacity style={styles.customBtn} onPress={aplicarCustom}>
                  <Text style={styles.customBtnText}>Poner</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {!viewer && (
          <>
            <TouchableOpacity style={styles.manoBtn} onPress={nextHand}>
              <Text style={styles.manoText}>🔄 Nueva mano (rota el dealer)</Text>
            </TouchableOpacity>

            {players.length < 9 && (
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  placeholder="Nombre del nuevo jugador…"
                  placeholderTextColor={colors.textDim}
                  value={newName}
                  onChangeText={setNewName}
                  onSubmitEditing={add}
                />
                <TouchableOpacity style={styles.addBtn} onPress={add}>
                  <Text style={styles.addBtnText}>➕ Añadir</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {players.length === 0 && (
          <Text style={styles.emptyHint}>
            {viewer ? 'Esperando a que el host arme la mesa…' : 'Añade jugadores para ver la mesa y usar el reloj.'}
          </Text>
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.modalBg}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            {selected && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Jugador en silla #{selected.seat}</Text>

                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Nombre"
                  placeholderTextColor={colors.textDim}
                  onEndEditing={() => renamePlayer(selected.id, editName)}
                />

                <Text style={styles.modalLabel}>Cambiar de silla (toca el número)</Text>
                <View style={styles.seatGrid}>
                  {SEATS.map(n => {
                    const mine = selected.seat === n;
                    const other = players.find(p => p.seat === n && p.id !== selected.id);
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.seatChip,
                          mine && { backgroundColor: colors.gold, borderColor: colors.gold },
                          other && { borderColor: colors.blue },
                        ]}
                        onPress={() => moveSeat(selected.id, n)}>
                        <Text style={[styles.seatChipText, mine && { color: '#3A2D00' }]}>{n}</Text>
                        {other && (
                          <Text style={styles.seatChipMini} numberOfLines={1}>
                            {other.name}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.dealerBtn}
                  onPress={() => {
                    setButton(selected.seat);
                    close();
                  }}>
                  <Text style={styles.dealerBtnText}>🔘 Poner el botón de DEALER aquí</Text>
                </TouchableOpacity>

                <Text style={styles.modalLabel}>Estado en la mano</Text>
                <View style={styles.statusRow}>
                  {STATUSES.map(st => {
                    const activeSt = selected.status === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.statusBtn,
                          activeSt && { backgroundColor: STATUS_COLOR[st], borderColor: STATUS_COLOR[st] },
                        ]}
                        onPress={() => setStatus(selected.id, st)}>
                        <Text style={[styles.statusBtnText, activeSt && { color: '#06301E' }]}>
                          {STATUS_LABEL[st]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() =>
                      Alert.alert('Quitar jugador', `¿Quitar a ${selected.name} de la mesa?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Quitar',
                          style: 'destructive',
                          onPress: () => {
                            removePlayer(selected.id);
                            close();
                          },
                        },
                      ])
                    }>
                    <Text style={styles.removeText}>🗑️ Quitar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => {
                      renamePlayer(selected.id, editName);
                      close();
                    }}>
                    <Text style={styles.doneText}>Listo</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Badge({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

function Pos({ label, name, c }: { label: string; name: string; c: string }) {
  return (
    <View style={styles.posItem}>
      <Text style={[styles.posLabel, { color: c }]}>{label}</Text>
      <Text style={styles.posName} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 14 },
  viewerBar: { backgroundColor: '#16324a', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.blue },
  viewerText: { color: '#Cfe6ff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  posBar: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  posItem: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 10, alignItems: 'center' },
  posLabel: { fontSize: 12, fontWeight: '800' },
  posName: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  table: {
    height: 300,
    backgroundColor: colors.felt,
    borderRadius: 150,
    borderWidth: 6,
    borderColor: colors.feltDark,
    marginVertical: 6,
  },
  tableCenter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -70 }, { translateY: -45 }],
    alignItems: 'center',
    width: 140,
  },
  streetBig: { color: '#fff', fontSize: 26, fontWeight: '900' },
  manoMid: { color: '#CDEBDD', fontSize: 14, marginTop: 2 },
  blindsMid: { color: '#CDEBDD', fontSize: 14 },
  seat: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: colors.card,
    transform: [{ translateX: -36 }, { translateY: -36 }],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  seatActing: {
    backgroundColor: '#2A2410',
    shadowColor: colors.gold,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  badges: { flexDirection: 'row', gap: 2, height: 15 },
  badge: { minWidth: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  seatName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  seatStatus: { fontSize: 10, fontWeight: '800' },
  clockCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  clockStreet: { color: colors.textDim, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  clockActing: { color: colors.gold, fontSize: 26, fontWeight: '900', marginBottom: 2 },
  numberWrap: { alignItems: 'center', paddingVertical: 4 },
  bigNumber: { fontSize: 76, fontWeight: '900', lineHeight: 82 },
  numberHint: { color: colors.textDim, fontSize: 12, marginTop: -4 },
  sigue: { color: colors.textDim, fontSize: 14, marginTop: 4, marginBottom: 10 },
  turnRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  turnBtn: {
    flex: 1,
    backgroundColor: colors.cardLight,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  turnNext: { backgroundColor: colors.gold, borderColor: colors.gold },
  foldBtn: { backgroundColor: colors.red, borderColor: colors.red },
  betBtn: { backgroundColor: colors.green, borderColor: colors.green },
  undoBtn: { alignSelf: 'center', paddingVertical: 8, marginTop: 8 },
  undoText: { color: colors.textDim, fontWeight: '700', fontSize: 13 },
  turnBtnText: { color: colors.text, fontSize: 16, fontWeight: '900' },
  row3: { flexDirection: 'row', gap: 10, marginTop: 10, alignSelf: 'stretch' },
  ctrl: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctrlActive: { borderColor: colors.green },
  ctrlText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  cfgLabel: { color: colors.textDim, fontWeight: '700', marginTop: 16, marginBottom: 8, alignSelf: 'flex-start' },
  presets: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  preset: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  presetOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  presetText: { color: colors.text, fontWeight: '800', fontSize: 14 },
  customRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignSelf: 'stretch' },
  customInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customBtn: {
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  customBtnText: { color: colors.text, fontWeight: '800' },
  manoBtn: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manoText: { color: colors.text, fontWeight: '800' },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtn: { backgroundColor: colors.green, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#06301E', fontWeight: '900' },
  emptyHint: { color: colors.textDim, fontSize: 14, textAlign: 'center', marginTop: 16 },
  modalBg: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 12 },
  nameInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalLabel: { color: colors.textDim, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seatChip: {
    width: 58,
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatChipText: { color: colors.text, fontWeight: '900', fontSize: 16 },
  seatChipMini: { color: colors.textDim, fontSize: 9 },
  dealerBtn: { backgroundColor: colors.gold, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 16 },
  dealerBtnText: { color: '#3A2D00', fontSize: 16, fontWeight: '900' },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  statusBtnText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 6 },
  removeBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.red },
  removeText: { color: colors.red, fontWeight: '800' },
  doneBtn: { flex: 2, backgroundColor: colors.green, borderRadius: 12, padding: 14, alignItems: 'center' },
  doneText: { color: '#06301E', fontWeight: '900', fontSize: 16 },
});
