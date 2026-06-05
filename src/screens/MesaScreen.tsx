import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export default function MesaScreen() {
  const { state, nextHand, cycleStatus } = useSession();
  const { players } = state;
  const pos = positions(state);
  const order = dealerOrder(state);
  const nameOf = (seat: number) => players.find(p => p.seat === seat)?.name ?? '—';

  const N = players.length;
  const RX = 40; // radios en %
  const RY = 38;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.handLabel}>Mano #{state.handNumber}</Text>

      <View style={styles.table}>
        <View style={styles.tableCenter}>
          <Text style={styles.centerText}>Ciegas</Text>
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
              onPress={() => cycleStatus(p.id)}
              style={[
                styles.seat,
                {
                  left: `${x}%`,
                  top: `${y}%`,
                  borderColor: STATUS_COLOR[p.status],
                  opacity: p.status === 'descansa' ? 0.55 : 1,
                },
              ]}>
              <View style={styles.badges}>
                {isBtn && <Badge text="D" bg={colors.gold} fg="#3A2D00" />}
                {isSb && <Badge text="1" bg={colors.blue} fg="#fff" />}
                {isBb && <Badge text="2" bg={colors.red} fg="#fff" />}
              </View>
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

      <Text style={styles.tip}>Toca un asiento para cambiar: Juega → Descansa → Reparte</Text>

      <TouchableOpacity style={styles.nextBtn} onPress={nextHand}>
        <Text style={styles.nextText}>Siguiente mano ▶</Text>
      </TouchableOpacity>

      <View style={styles.freqBox}>
        <Text style={styles.freqTitle}>🔘 Orden de dealer (próximas manos)</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 14 },
  handLabel: { color: colors.textDim, fontWeight: '700', fontSize: 15, marginBottom: 6 },
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
  centerText: { color: '#CDEBDD', fontSize: 12, letterSpacing: 1 },
  centerBlinds: { color: '#fff', fontSize: 24, fontWeight: '900' },
  seat: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 2.5,
    transform: [{ translateX: -37 }, { translateY: -37 }],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badges: { flexDirection: 'row', gap: 2, height: 16, marginBottom: 1 },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '900' },
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
  freqBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  freqTitle: { color: colors.text, fontWeight: '800', marginBottom: 8 },
  freqLine: { color: colors.text, fontSize: 14, paddingVertical: 2 },
  sub: { color: colors.textDim, fontSize: 13 },
});
