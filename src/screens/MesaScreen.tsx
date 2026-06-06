import React, { useState } from 'react';
import {
  Alert,
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
import { dealerOrder, positions } from '../logic/poker';
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

export default function MesaScreen() {
  const { state, nextHand, setButton, setStatus, renamePlayer, removePlayer, moveSeat, addPlayer } =
    useSession();
  const { players } = state;
  const pos = positions(state);
  const order = dealerOrder(state);
  const nameOf = (seat: number | null) => players.find(p => p.seat === seat)?.name ?? '—';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const selected = players.find(p => p.id === selectedId) ?? null;

  const open = (id: string, name: string) => {
    setSelectedId(id);
    setEditName(name);
  };
  const close = () => setSelectedId(null);

  const add = () => {
    addPlayer(newName);
    setNewName('');
  };

  const N = players.length;
  const RX = 40;
  const RY = 38;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.posBar}>
        <Pos label="🔘 Dealer" name={nameOf(pos.button)} c={colors.gold} />
        <Pos label="1 Ciega" name={nameOf(pos.sb)} c={colors.blue} />
        <Pos label="2 Ciega" name={nameOf(pos.bb)} c={colors.red} />
      </View>

      <View style={styles.table}>
        <View style={styles.tableCenter}>
          <Text style={styles.centerText}>Mano #{state.handNumber}</Text>
          <Text style={styles.centerBlinds}>
            {state.smallBlind} / {state.bigBlind}
          </Text>
        </View>

        {players.map((p, i) => {
          const angle = (-90 + (360 * i) / Math.max(N, 1)) * (Math.PI / 180);
          const x = 50 + RX * Math.cos(angle);
          const y = 50 + RY * Math.sin(angle);
          const isBtn = pos.button === p.seat;
          const isSb = pos.sb === p.seat;
          const isBb = pos.bb === p.seat;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => open(p.id, p.name)}
              style={[
                styles.seat,
                {
                  left: `${x}%`,
                  top: `${y}%`,
                  borderColor: isBtn ? colors.gold : STATUS_COLOR[p.status],
                  borderWidth: isBtn ? 3 : 2,
                  opacity: p.status === 'descansa' ? 0.5 : 1,
                },
              ]}>
              <View style={styles.badges}>
                {isBtn && <Badge text="D" bg={colors.gold} fg="#3A2D00" />}
                {isSb && <Badge text="1" bg={colors.blue} fg="#fff" />}
                {isBb && <Badge text="2" bg={colors.red} fg="#fff" />}
              </View>
              <Text style={styles.seatSeat}>#{p.seat}</Text>
              <Text style={styles.seatName} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={[styles.seatStatus, { color: STATUS_COLOR[p.status] }]}>
                {STATUS_LABEL[p.status]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.tip}>👆 Toca un asiento para mover dealer, cambiar de silla, estado o nombre</Text>

      <TouchableOpacity style={styles.nextBtn} onPress={nextHand}>
        <Text style={styles.nextText}>Siguiente mano ▶</Text>
      </TouchableOpacity>

      {/* Añadir jugador */}
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

      <View style={styles.freqBox}>
        <Text style={styles.freqTitle}>🔘 Orden del dealer</Text>
        {order.length === 0 ? (
          <Text style={styles.sub}>No hay jugadores activos.</Text>
        ) : (
          order.map((seat, i) => (
            <Text key={seat} style={styles.freqLine}>
              {i === 0 ? '👉 Ahora' : `En ${i} mano${i > 1 ? 's' : ''}`}:{' '}
              <Text style={{ color: colors.gold, fontWeight: '800' }}>{nameOf(seat)}</Text>
            </Text>
          ))
        )}
      </View>

      {/* Menú de edición del asiento */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            {selected && (
              <ScrollView>
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
                        {other && <Text style={styles.seatChipMini} numberOfLines={1}>{other.name}</Text>}
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
        </View>
      </Modal>
    </ScrollView>
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
  posBar: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  posItem: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 10, alignItems: 'center' },
  posLabel: { fontSize: 12, fontWeight: '800' },
  posName: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  table: {
    height: 360,
    backgroundColor: colors.felt,
    borderRadius: 180,
    borderWidth: 6,
    borderColor: colors.feltDark,
    marginVertical: 6,
  },
  tableCenter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -45 }, { translateY: -28 }],
    alignItems: 'center',
    width: 90,
  },
  centerText: { color: '#CDEBDD', fontSize: 13, letterSpacing: 1 },
  centerBlinds: { color: '#fff', fontSize: 24, fontWeight: '900' },
  seat: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: colors.card,
    transform: [{ translateX: -38 }, { translateY: -38 }],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badges: { flexDirection: 'row', gap: 2, height: 15 },
  badge: {
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '900' },
  seatSeat: { color: colors.textDim, fontSize: 9, fontWeight: '700' },
  seatName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  seatStatus: { fontSize: 10, fontWeight: '700' },
  tip: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 4 },
  nextBtn: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  nextText: { color: '#3A2D00', fontSize: 18, fontWeight: '900' },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtn: { backgroundColor: colors.cardLight, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: colors.text, fontWeight: '800' },
  freqBox: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginTop: 14 },
  freqTitle: { color: colors.text, fontWeight: '800', marginBottom: 8 },
  freqLine: { color: colors.text, fontSize: 14, paddingVertical: 2 },
  sub: { color: colors.textDim, fontSize: 13 },
  // modal
  modalBg: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    maxHeight: '85%',
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
  removeBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.red,
  },
  removeText: { color: colors.red, fontWeight: '800' },
  doneBtn: { flex: 2, backgroundColor: colors.green, borderRadius: 12, padding: 14, alignItems: 'center' },
  doneText: { color: '#06301E', fontWeight: '900', fontSize: 16 },
});
