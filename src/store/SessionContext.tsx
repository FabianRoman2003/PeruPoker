import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Player, SeatStatus, SessionState } from '../types';
import { advanceButton, activeSeats, nextActiveSeat, positions } from '../logic/poker';

const STORAGE_KEY = '@perupoker_session';
const uid = () => Math.random().toString(36).slice(2, 10);

// Datos de ejemplo para que la base se vea funcionando de una vez
const seedPlayers = (): Player[] =>
  ['Jorge', 'Pedro', 'Ana', 'Luis', 'Carlos'].map((name, i) => ({
    id: uid(),
    seat: i + 1,
    name,
    status: 'juega' as SeatStatus,
    buyins: 1,
    cashout: null,
  }));

const initialState = (): SessionState => ({
  boxValue: 20,
  smallBlind: 1,
  bigBlind: 2,
  shotClockSeconds: 30,
  players: seedPlayers(),
  buttonSeat: 1,
  actingSeat: null,
  handNumber: 1,
  log: [],
});

interface Ctx {
  state: SessionState;
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
  setActingSeat: (seat: number | null) => void;
  setBoxValue: (v: number) => void;
  setShotClock: (v: number) => void;
  resetCashouts: () => void;
  newSession: () => void;
}

const SessionCtx = createContext<Ctx | null>(null);

const STATUS_CYCLE: SeatStatus[] = ['juega', 'descansa', 'solo_reparte'];

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SessionState>(initialState);
  const [loaded, setLoaded] = useState(false);

  // Cargar la sesión guardada al abrir la app
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          setState(JSON.parse(raw));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  // Guardar automáticamente en cada cambio (después de cargar)
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  const addPlayer = useCallback((name: string) => {
    setState(s => {
      if (s.players.length >= 9) return s; // máximo 9
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
      return { ...s, players: [...s.players, player].sort((a, b) => a.seat - b.seat) };
    });
  }, []);

  const removePlayer = useCallback((id: string) => {
    setState(s => ({ ...s, players: s.players.filter(p => p.id !== id) }));
  }, []);

  const renamePlayer = useCallback((id: string, name: string) => {
    setState(s => ({
      ...s,
      players: s.players.map(p => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
    }));
  }, []);

  const cycleStatus = useCallback((id: string) => {
    setState(s => ({
      ...s,
      players: s.players.map(p =>
        p.id === id
          ? { ...p, status: STATUS_CYCLE[(STATUS_CYCLE.indexOf(p.status) + 1) % 3] }
          : p,
      ),
    }));
  }, []);

  const setStatus = useCallback((id: string, status: SeatStatus) => {
    setState(s => ({
      ...s,
      players: s.players.map(p => (p.id === id ? { ...p, status } : p)),
    }));
  }, []);

  // Mover el botón de dealer manualmente al asiento elegido
  const setButton = useCallback((seat: number) => {
    setState(s => ({ ...s, buttonSeat: seat }));
  }, []);

  // Cambiar a un jugador de silla. Si la silla está ocupada, intercambia.
  const moveSeat = useCallback((id: string, newSeat: number) => {
    setState(s => {
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
    setState(s => ({
      ...s,
      players: s.players.map(p => (p.id === id ? { ...p, buyins: p.buyins + 1 } : p)),
      log: [{ id: uid(), playerId: id, at: Date.now() }, ...s.log],
    }));
  }, []);

  const removeBuyin = useCallback((id: string) => {
    setState(s => ({
      ...s,
      players: s.players.map(p =>
        p.id === id ? { ...p, buyins: Math.max(0, p.buyins - 1) } : p,
      ),
    }));
  }, []);

  const setCashout = useCallback((id: string, chips: number | null) => {
    setState(s => ({
      ...s,
      players: s.players.map(p => (p.id === id ? { ...p, cashout: chips } : p)),
    }));
  }, []);

  const resetCashouts = useCallback(() => {
    setState(s => ({ ...s, players: s.players.map(p => ({ ...p, cashout: null })) }));
  }, []);

  const nextHand = useCallback(() => {
    setState(s => {
      const button = advanceButton(s);
      const active = activeSeats(s.players);
      const pos = positions({ ...s, buttonSeat: button });
      const acting = pos.utg ?? nextActiveSeat(button ?? 0, active);
      return { ...s, buttonSeat: button, actingSeat: acting, handNumber: s.handNumber + 1 };
    });
  }, []);

  const setActingSeat = useCallback((seat: number | null) => {
    setState(s => ({ ...s, actingSeat: seat }));
  }, []);

  const setBoxValue = useCallback((v: number) => {
    setState(s => ({ ...s, boxValue: v }));
  }, []);

  const setShotClock = useCallback((v: number) => {
    setState(s => ({ ...s, shotClockSeconds: v }));
  }, []);

  // Empezar una mesa nueva (mantiene a los jugadores, reinicia dinero y cuentas)
  const newSession = useCallback(() => {
    setState(s => ({
      ...s,
      players: s.players.map(p => ({ ...p, buyins: 1, cashout: null })),
      handNumber: 1,
      log: [],
    }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
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
      setActingSeat,
      setBoxValue,
      setShotClock,
      resetCashouts,
      newSession,
    }),
    [
      state,
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
      setActingSeat,
      setBoxValue,
      setShotClock,
      resetCashouts,
      newSession,
    ],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
};

export const useSession = (): Ctx => {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
};
