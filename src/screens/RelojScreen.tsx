import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { colors } from '../theme/colors';
import { useSession } from '../store/SessionContext';
import { activeSeats, nextActiveSeat, positions } from '../logic/poker';

const PRESETS = [15, 20, 30, 45, 60];

export default function RelojScreen() {
  const { state, setActingSeat, setShotClock } = useSession();
  const full = state.shotClockSeconds;
  const [remaining, setRemaining] = useState(full);
  const [running, setRunning] = useState(false);

  const active = activeSeats(state.players);
  const acting = state.actingSeat ?? positions(state).utg ?? active[0] ?? null;
  const actingName = state.players.find(p => p.seat === acting)?.name ?? '—';
  const nextSeat = acting != null ? nextActiveSeat(acting, active) : active[0] ?? null;
  const nextName = state.players.find(p => p.seat === nextSeat)?.name ?? '—';

  // Cuenta regresiva
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Aviso a los 5s y parada automática en 0
  useEffect(() => {
    if (remaining === 5) Vibration.vibrate(200);
    if (remaining === 0) {
      Vibration.vibrate(500);
      setRunning(false);
    }
  }, [remaining]);

  const pasarTurno = () => {
    if (acting != null) setActingSeat(nextActiveSeat(acting, active));
    else if (active.length) setActingSeat(active[0]);
    setRemaining(full);
    setRunning(true);
  };

  const reiniciar = () => {
    setRemaining(full);
    setRunning(false);
  };

  const setDuration = (secs: number) => {
    setShotClock(secs);
    setRemaining(secs);
    setRunning(false);
  };

  const danger = remaining <= 5;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>EN ACCIÓN</Text>
      <Text style={styles.actingName}>{actingName}</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={pasarTurno}
        style={[styles.clock, { borderColor: danger ? colors.red : colors.green }]}>
        <Text style={[styles.clockText, { color: danger ? colors.red : colors.text }]}>{remaining}</Text>
        <Text style={styles.clockUnit}>toca para pasar</Text>
      </TouchableOpacity>

      <Text style={styles.next}>
        Sigue: <Text style={{ color: colors.gold, fontWeight: '800' }}>{nextName}</Text>
      </Text>

      <TouchableOpacity style={styles.bigBtn} onPress={pasarTurno}>
        <Text style={styles.bigBtnText}>SIGUIENTE TURNO ▶</Text>
      </TouchableOpacity>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.ctrl, running && styles.ctrlActive]}
          onPress={() => setRunning(r => !r)}>
          <Text style={styles.ctrlText}>{running ? '⏸  Pausar' : '▶  Iniciar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrl} onPress={reiniciar}>
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
              onPress={() => setDuration(s)}>
              <Text style={[styles.presetText, on && { color: '#3A2D00' }]}>{s}s</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', padding: 20 },
  label: { color: colors.textDim, letterSpacing: 3, fontWeight: '800', marginTop: 4 },
  actingName: { color: colors.text, fontSize: 30, fontWeight: '900', marginBottom: 14 },
  clock: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  clockText: { fontSize: 80, fontWeight: '900' },
  clockUnit: { color: colors.textDim, fontSize: 13, marginTop: -6 },
  next: { color: colors.textDim, fontSize: 16, marginTop: 14 },
  bigBtn: {
    backgroundColor: colors.gold,
    borderRadius: 18,
    paddingVertical: 22,
    alignItems: 'center',
    marginTop: 16,
    alignSelf: 'stretch',
  },
  bigBtnText: { color: '#3A2D00', fontSize: 23, fontWeight: '900' },
  controls: { flexDirection: 'row', gap: 12, marginTop: 14, alignSelf: 'stretch' },
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
  cfgLabel: { color: colors.textDim, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  presets: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  preset: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  presetOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  presetText: { color: colors.text, fontWeight: '800', fontSize: 14 },
});
