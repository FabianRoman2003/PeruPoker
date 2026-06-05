import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { colors } from '../theme/colors';
import { useSession } from '../store/SessionContext';
import { activeSeats, nextActiveSeat, positions } from '../logic/poker';

export default function RelojScreen() {
  const { state, setActingSeat } = useSession();
  const full = state.shotClockSeconds;
  const [remaining, setRemaining] = useState(full);
  const [running, setRunning] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const active = activeSeats(state.players);
  const acting = state.actingSeat ?? positions(state).utg ?? active[0] ?? null;
  const actingName = state.players.find(p => p.seat === acting)?.name ?? '—';

  // Cuenta regresiva
  useEffect(() => {
    if (running) {
      tick.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            Vibration.vibrate(400);
            return 0;
          }
          if (r === 6) Vibration.vibrate(200); // aviso a los 5s
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running]);

  const pasarTurno = () => {
    if (acting != null) {
      const next = nextActiveSeat(acting, active);
      setActingSeat(next);
    } else if (active.length) {
      setActingSeat(active[0]);
    }
    setRemaining(full);
    setRunning(true);
  };

  const reiniciar = () => {
    setRemaining(full);
  };

  const danger = remaining <= 5;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>EN ACCIÓN</Text>
      <Text style={styles.actingName}>{actingName}</Text>

      <View
        style={[
          styles.clock,
          { borderColor: danger ? colors.red : colors.green },
        ]}>
        <Text style={[styles.clockText, { color: danger ? colors.red : colors.text }]}>
          {remaining}
        </Text>
        <Text style={styles.clockUnit}>seg</Text>
      </View>

      <TouchableOpacity style={styles.bigBtn} onPress={pasarTurno}>
        <Text style={styles.bigBtnText}>SIGUIENTE TURNO ▶</Text>
      </TouchableOpacity>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.ctrl, running && styles.ctrlActive]}
          onPress={() => setRunning(r => !r)}>
          <Text style={styles.ctrlText}>{running ? '⏸  Pausa' : '▶  Seguir'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrl} onPress={reiniciar}>
          <Text style={styles.ctrlText}>↻  Reiniciar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Reloj de {full}s por jugador · cash game (sin subir ciegas)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', padding: 20 },
  label: { color: colors.textDim, letterSpacing: 3, fontWeight: '800', marginTop: 8 },
  actingName: { color: colors.text, fontSize: 30, fontWeight: '900', marginBottom: 18 },
  clock: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  clockText: { fontSize: 84, fontWeight: '900' },
  clockUnit: { color: colors.textDim, fontSize: 16, marginTop: -8 },
  bigBtn: {
    backgroundColor: colors.gold,
    borderRadius: 18,
    paddingVertical: 26,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 28,
    alignSelf: 'stretch',
  },
  bigBtnText: { color: '#3A2D00', fontSize: 24, fontWeight: '900' },
  controls: { flexDirection: 'row', gap: 12, marginTop: 16, alignSelf: 'stretch' },
  ctrl: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctrlActive: { borderColor: colors.green },
  ctrlText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  hint: { color: colors.textDim, fontSize: 12, marginTop: 18, textAlign: 'center' },
});
