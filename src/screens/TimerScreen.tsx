import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native';
import { colors } from '../theme/colors';

const PRESETS = [15, 20, 30, 45, 60, 90];

function buzz(ms: number) {
  try {
    Vibration.vibrate(ms);
  } catch {}
}

export default function TimerScreen() {
  const [duration, setDuration] = useState(30); // tiempo configurado
  const [base, setBase] = useState(30); // restante al pausar/fijar
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [custom, setCustom] = useState('');
  const [, force] = useState(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => force(n => n + 1), 250);
    return () => clearInterval(t);
  }, [running, startedAt]);

  const remaining = running && startedAt ? Math.max(0, base - Math.floor((Date.now() - startedAt) / 1000)) : base;
  const danger = remaining <= 5;

  const prev = useRef(remaining);
  useEffect(() => {
    const p = prev.current;
    if (p > 5 && remaining <= 5 && remaining > 0) buzz(200);
    if (p > 0 && remaining === 0) {
      buzz(600);
      setRunning(false);
    }
    prev.current = remaining;
  }, [remaining]);

  const startFresh = () => {
    setBase(duration);
    setStartedAt(Date.now());
    setRunning(true);
  };
  const toggle = () => {
    if (running) {
      setBase(remaining);
      setStartedAt(null);
      setRunning(false);
    } else {
      setBase(remaining > 0 ? remaining : duration);
      setStartedAt(Date.now());
      setRunning(true);
    }
  };
  const reset = () => {
    setBase(duration);
    setStartedAt(null);
    setRunning(false);
  };
  const setDur = (s: number) => {
    const v = Math.max(1, Math.min(999, s));
    setDuration(v);
    setBase(v);
    setStartedAt(null);
    setRunning(false);
  };
  const applyCustom = () => {
    const n = parseInt(custom, 10);
    if (n && n > 0) {
      setDur(n);
      setCustom('');
    }
  };

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const display = remaining >= 60 ? `${mm}:${ss.toString().padStart(2, '0')}` : `${remaining}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⏱️ Cronómetro</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={startFresh}
        style={[styles.clock, { borderColor: danger ? colors.red : colors.green }]}>
        <Text style={[styles.clockText, { color: danger ? colors.red : '#fff' }]}>{display}</Text>
        <Text style={styles.clockHint}>toca para (re)iniciar</Text>
      </TouchableOpacity>

      {/* ajuste fino */}
      <View style={styles.adjustRow}>
        <TouchableOpacity style={styles.adjBtn} onPress={() => setDur(duration - 5)}>
          <Text style={styles.adjText}>−5s</Text>
        </TouchableOpacity>
        <Text style={styles.durLabel}>{duration}s</Text>
        <TouchableOpacity style={styles.adjBtn} onPress={() => setDur(duration + 5)}>
          <Text style={styles.adjText}>+5s</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.ctrl, running && styles.ctrlActive]} onPress={toggle}>
          <Text style={styles.ctrlText}>{running ? '⏸  Pausar' : '▶  Iniciar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrl} onPress={reset}>
          <Text style={styles.ctrlText}>↻  Reiniciar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.cfgLabel}>Tiempo rápido</Text>
      <View style={styles.presets}>
        {PRESETS.map(s => {
          const on = duration === s;
          return (
            <TouchableOpacity key={s} style={[styles.preset, on && styles.presetOn]} onPress={() => setDur(s)}>
              <Text style={[styles.presetText, on && { color: '#3A2D00' }]}>{s}s</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.customRow}>
        <TextInput
          style={styles.customInput}
          keyboardType="number-pad"
          placeholder="Segundos personalizados…"
          placeholderTextColor={colors.textDim}
          value={custom}
          onChangeText={setCustom}
          onSubmitEditing={applyCustom}
        />
        <TouchableOpacity style={styles.customBtn} onPress={applyCustom}>
          <Text style={styles.customBtnText}>Poner</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', padding: 20 },
  title: { color: colors.textDim, fontSize: 16, fontWeight: '800', letterSpacing: 2, marginTop: 6, marginBottom: 18 },
  clock: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  clockText: { fontSize: 88, fontWeight: '900' },
  clockHint: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 22 },
  adjBtn: { backgroundColor: colors.card, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22, borderWidth: 1, borderColor: colors.border },
  adjText: { color: colors.text, fontWeight: '900', fontSize: 16 },
  durLabel: { color: colors.gold, fontWeight: '900', fontSize: 22, minWidth: 70, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 12, marginTop: 20, alignSelf: 'stretch' },
  ctrl: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  ctrlActive: { borderColor: colors.green },
  ctrlText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  cfgLabel: { color: colors.textDim, fontWeight: '700', marginTop: 22, marginBottom: 8, alignSelf: 'flex-start' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' },
  preset: {
    width: '31%',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  presetOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  presetText: { color: colors.text, fontWeight: '800', fontSize: 15 },
  customRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignSelf: 'stretch' },
  customInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customBtn: { backgroundColor: colors.cardLight, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  customBtnText: { color: colors.text, fontWeight: '800' },
});
