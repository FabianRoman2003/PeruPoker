import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnlineState, Player, SeatStatus, SessionState } from '../types';
import { actionOrder, advanceButton, preflopStart } from '../logic/poker';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';

const STORAGE_KEY = '@perupoker_session';
const uid = () => Math.random().toString(36).slice(2, 10);

const initialState = (): SessionState => ({
  boxValue: 20,
  smallBlind: 1,
  bigBlind: 2,
  shotClockSeconds: 30,
  players: [],
  buttonSeat: null,
  actingSeat: null,
  street: 0,
  handNumber: 1,
  log: [],
  timerRunning: false,
  turnStartedAt: null,
  timerBase: 30,
});

// Segundos restantes calculados (cada celular lo calcula solo)
export function computeRemaining(s: SessionState, now: number): number {
  if (s.timerRunning && s.turnStartedAt) {
    return Math.max(0, s.timerBase - Math.floor((now - s.turnStartedAt) / 1000));
  }
  return s.timerBase;
}

interface Ctx {
  state: SessionState;
  ready: boolean;
  online: OnlineState;
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  renamePlayer: (id: string, name: string) => void;
  cycleStatus: (id: string) => void;
  setStatus: (id: string, status: SeatStatus) => void;
  setButton: (seat: number) => void;
  moveSeat: (id: string, newSeat: number) => void;
  addBuyin: (id: string) => void;
  removeBuyin: (id: string) => void;
  setCashout: (id: string, chips: number | null) => void;
  nextHand: () => void;
  nextTurn: () => void;
  prevTurn: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setShotClock: (v: number) => void;
  resetCashouts: () => void;
  clearTable: () => void;
  createRoom: () => Promise<string | null>;
  joinRoom: (code: string) => Promise<{ ok: boolean; error?: string }>;
  leaveRoom: () => void;
}

const SessionCtx = createContext<Ctx | null>(null);

const STATUS_CYCLE: SeatStatus[] = ['juega', 'descansa', 'solo_reparte'];

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SessionState>(initialState);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState<OnlineState>({ role: 'off', code: null });

  const stateRef = useRef(state);
  stateRef.current = state;
  const roleRef = useRef(online.role);
  const codeRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar sesión local guardada
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          setState({ ...initialState(), ...JSON.parse(raw) });
        } catch {}
      }
      setReady(true);
    });
  }, []);

  // Guardar local + (si es host) publicar a la sala con debounce
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (roleRef.current === 'host' && codeRef.current) {
      if (pushRef.current) clearTimeout(pushRef.current);
      const code = codeRef.current;
      pushRef.current = setTimeout(() => {
        supabase
          .from('rooms')
          .update({ state, updated_at: new Date().toISOString() })
          .eq('code', code)
          .then(() => {});
      }, 350);
    }
  }, [state, ready]);

  // Solo el host (o modo local) puede modificar; el espectador es solo-lectura
  const setGuarded: typeof setState = updater => {
    if (roleRef.current === 'viewer') return;
    setState(updater as any);
  };

  const addPlayer = useCallback((name: string) => {
    setGuarded(s => {
      if (s.players.length >= 9) return s;
      const taken = new Set(s.players.map(p => p.seat));
      let seat = 1;
      while (taken.has(seat)) seat++;
      const player: Player = {
        id: uid(),
        seat,
        name: name.trim() || `Jugador ${seat}`,
        status: 'juega',
        buyins: 1,
        cashout: null,
      };
      const players = [...s.players, player].sort((a, b) => a.seat - b.seat);
      const buttonSeat = s.buttonSeat ?? seat;
      const ns = { ...s, players, buttonSeat };
      return { ...ns, actingSeat: s.actingSeat ?? preflopStart(ns) };
    });
  }, []);

  const removePlayer = useCallback((id: string) => {
    setGuarded(s => ({ ...s, players: s.players.filter(p => p.id !== id) }));
  }, []);

  const renamePlayer = useCallback((id: string, name: string) => {
    setGuarded(s => ({
      ...s,
      players: s.players.map(p => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
    }));
  }, []);

  const cycleStatus = useCallback((id: string) => {
    setGuarded(s => ({
      ...s,
      players: s.players.map(p =>
        p.id === id ? { ...p, status: STATUS_CYCLE[(STATUS_CYCLE.indexOf(p.status) + 1) % 3] } : p,
      ),
    }));
  }, []);

  const setStatus = useCallback((id: string, status: SeatStatus) => {
    setGuarded(s => ({ ...s, players: s.players.map(p => (p.id === id ? { ...p, status } : p)) }));
  }, []);

  const setButton = useCallback((seat: number) => {
    setGuarded(s => ({ ...s, buttonSeat: seat }));
  }, []);

  const moveSeat = useCallback((id: string, newSeat: number) => {
    setGuarded(s => {
      const me = s.players.find(p => p.id === id);
      if (!me || me.seat === newSeat) return s;
      const occupant = s.players.find(p => p.seat === newSeat);
      const players = s.players
        .map(p => {
          if (p.id === id) return { ...p, seat: newSeat };
          if (occupant && p.id === occupant.id) return { ...p, seat: me.seat };
          return p;
        })
        .sort((a, b) => a.seat - b.seat);
      return { ...s, players };
    });
  }, []);

  const addBuyin = useCallback((id: string) => {
    setGuarded(s => ({
      ...s,
      players: s.players.map(p => (p.id === id ? { ...p, buyins: p.buyins + 1 } : p)),
      log: [{ id: uid(), playerId: id, at: Date.now() }, ...s.log],
    }));
  }, []);

  const removeBuyin = useCallback((id: string) => {
    setGuarded(s => ({
      ...s,
      players: s.players.map(p => (p.id === id ? { ...p, buyins: Math.max(0, p.buyins - 1) } : p)),
    }));
  }, []);

  const setCashout = useCallback((id: string, chips: number | null) => {
    setGuarded(s => ({ ...s, players: s.players.map(p => (p.id === id ? { ...p, cashout: chips } : p)) }));
  }, []);

  const resetCashouts = useCallback(() => {
    setGuarded(s => ({ ...s, players: s.players.map(p => ({ ...p, cashout: null })) }));
  }, []);

  const startTurnClock = (s: SessionState): SessionState => ({
    ...s,
    timerBase: s.shotClockSeconds,
    turnStartedAt: Date.now(),
    timerRunning: true,
  });

  const nextHand = useCallback(() => {
    setGuarded(s => {
      const button = advanceButton(s);
      const ns = { ...s, buttonSeat: button, street: 0 };
      return startTurnClock({ ...ns, actingSeat: preflopStart(ns), handNumber: s.handNumber + 1 });
    });
  }, []);

  const nextTurn = useCallback(() => {
    setGuarded(s => {
      const order = actionOrder(s, s.street);
      if (order.length === 0) return s;
      const i = s.actingSeat == null ? -1 : order.indexOf(s.actingSeat);
      if (i < 0) return startTurnClock({ ...s, actingSeat: order[0] });
      if (i < order.length - 1) return startTurnClock({ ...s, actingSeat: order[i + 1] });
      if (s.street < 3) {
        const ns = { ...s, street: s.street + 1 };
        const norder = actionOrder(ns, ns.street);
        return startTurnClock({ ...ns, actingSeat: norder[0] ?? null });
      }
      const button = advanceButton(s);
      const nh = { ...s, buttonSeat: button, street: 0 };
      return startTurnClock({ ...nh, actingSeat: preflopStart(nh), handNumber: s.handNumber + 1 });
    });
  }, []);

  const prevTurn = useCallback(() => {
    setGuarded(s => {
      const order = actionOrder(s, s.street);
      if (order.length === 0) return s;
      const i = s.actingSeat == null ? -1 : order.indexOf(s.actingSeat);
      if (i > 0) return startTurnClock({ ...s, actingSeat: order[i - 1] });
      if (s.street > 0) {
        const ps = { ...s, street: s.street - 1 };
        const porder = actionOrder(ps, ps.street);
        return startTurnClock({ ...ps, actingSeat: porder[porder.length - 1] ?? null });
      }
      return s;
    });
  }, []);

  const startTimer = useCallback(() => {
    setGuarded(s => ({
      ...s,
      timerBase: computeRemaining(s, Date.now()),
      turnStartedAt: Date.now(),
      timerRunning: true,
    }));
  }, []);

  const pauseTimer = useCallback(() => {
    setGuarded(s => ({
      ...s,
      timerBase: computeRemaining(s, Date.now()),
      turnStartedAt: null,
      timerRunning: false,
    }));
  }, []);

  const resetTimer = useCallback(() => {
    setGuarded(s => ({ ...s, timerBase: s.shotClockSeconds, turnStartedAt: null, timerRunning: false }));
  }, []);

  const setShotClock = useCallback((v: number) => {
    setGuarded(s => ({ ...s, shotClockSeconds: v, timerBase: v, turnStartedAt: null, timerRunning: false }));
  }, []);

  const clearTable = useCallback(() => {
    setGuarded(s => ({
      ...s,
      players: [],
      buttonSeat: null,
      actingSeat: null,
      street: 0,
      handNumber: 1,
      log: [],
      timerRunning: false,
      turnStartedAt: null,
      timerBase: s.shotClockSeconds,
    }));
  }, []);

  // ====== Salas en vivo (Realtime) ======
  const createRoom = useCallback(async (): Promise<string | null> => {
    const code = 'MESA-' + Math.floor(1000 + Math.random() * 9000);
    const hostName = (await getCurrentUser()) ?? 'host';
    const { error } = await supabase
      .from('rooms')
      .upsert({ code, state: stateRef.current, host: hostName, updated_at: new Date().toISOString() });
    if (error) return null;
    roleRef.current = 'host';
    codeRef.current = code;
    setOnline({ role: 'host', code, hostName });
    return code;
  }, []);

  const joinRoom = useCallback(async (rawCode: string): Promise<{ ok: boolean; error?: string }> => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return { ok: false, error: 'Escribe el código' };
    const { data, error } = await supabase.from('rooms').select('state,host').eq('code', code).maybeSingle();
    if (error) return { ok: false, error: 'Error de conexión' };
    if (!data) return { ok: false, error: 'Sala no encontrada' };
    setState({ ...initialState(), ...(data.state as SessionState) });
    roleRef.current = 'viewer';
    codeRef.current = code;
    setOnline({ role: 'viewer', code, hostName: (data as any).host });
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel('room-' + code)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: 'code=eq.' + code },
        payload => {
          const ns = (payload.new as any)?.state;
          if (ns) setState(ns as SessionState);
        },
      )
      .subscribe();
    return { ok: true };
  }, []);

  const leaveRoom = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    roleRef.current = 'off';
    codeRef.current = null;
    setOnline({ role: 'off', code: null });
  }, []);

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
      online,
      addPlayer,
      removePlayer,
      renamePlayer,
      cycleStatus,
      setStatus,
      setButton,
      moveSeat,
      addBuyin,
      removeBuyin,
      setCashout,
      nextHand,
      nextTurn,
      prevTurn,
      startTimer,
      pauseTimer,
      resetTimer,
      setShotClock,
      resetCashouts,
      clearTable,
      createRoom,
      joinRoom,
      leaveRoom,
    }),
    [
      state,
      ready,
      online,
      addPlayer,
      removePlayer,
      renamePlayer,
      cycleStatus,
      setStatus,
      setButton,
      moveSeat,
      addBuyin,
      removeBuyin,
      setCashout,
      nextHand,
      nextTurn,
      prevTurn,
      startTimer,
      pauseTimer,
      resetTimer,
      setShotClock,
      resetCashouts,
      clearTable,
      createRoom,
      joinRoom,
      leaveRoom,
    ],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
};

export const useSession = (): Ctx => {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
};
