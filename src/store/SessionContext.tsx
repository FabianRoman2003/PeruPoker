import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Player, SeatStatus, SessionState } from '../types';
import { actionOrder, advanceButton, preflopStart } from '../logic/poker';

const STORAGE_KEY = '@perupoker_session';
const uid = () => Math.random().toString(36).slice(2, 10);

// La mesa empieza VACÍA: el crupier añade a los jugadores reales.
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
});

interface Ctx {
  state: SessionState;
  ready: boolean;
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
  setShotClock: (v: number) => void;
  resetCashouts: () => void;
  clearTable: () => void;
}

const SessionCtx = createContext<Ctx | null>(null);

const STATUS_CYCLE: SeatStatus[] = ['juega', 'descansa', 'solo_reparte'];

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SessionState>(initialState);
  const [ready, setReady] = useState(false);

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

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const addPlayer = useCallback((name: string) => {
    setState(s => {
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
        p.id === id ? { ...p, status: STATUS_CYCLE[(STATUS_CYCLE.indexOf(p.status) + 1) % 3] } : p,
      ),
    }));
  }, []);

  const setStatus = useCallback((id: string, status: SeatStatus) => {
    setState(s => ({ ...s, players: s.players.map(p => (p.id === id ? { ...p, status } : p)) }));
  }, []);

  const setButton = useCallback((seat: number) => {
    setState(s => ({ ...s, buttonSeat: seat }));
  }, []);

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
      players: s.players.map(p => (p.id === id ? { ...p, buyins: Math.max(0, p.buyins - 1) } : p)),
    }));
  }, []);

  const setCashout = useCallback((id: string, chips: number | null) => {
    setState(s => ({ ...s, players: s.players.map(p => (p.id === id ? { ...p, cashout: chips } : p)) }));
  }, []);

  const resetCashouts = useCallback(() => {
    setState(s => ({ ...s, players: s.players.map(p => ({ ...p, cashout: null })) }));
  }, []);

  // Nueva mano: rota el botón y vuelve a Preflop (habla el de después de la ciega grande)
  const nextHand = useCallback(() => {
    setState(s => {
      const button = advanceButton(s);
      const ns = { ...s, buttonSeat: button, street: 0 };
      return { ...ns, actingSeat: preflopStart(ns), handNumber: s.handNumber + 1 };
    });
  }, []);

  // Siguiente turno (orden de poker; al acabar la calle pasa a la siguiente; tras el river, nueva mano)
  const nextTurn = useCallback(() => {
    setState(s => {
      const order = actionOrder(s, s.street);
      if (order.length === 0) return s;
      const i = s.actingSeat == null ? -1 : order.indexOf(s.actingSeat);
      if (i < 0) return { ...s, actingSeat: order[0] };
      if (i < order.length - 1) return { ...s, actingSeat: order[i + 1] };
      // fin de la calle
      if (s.street < 3) {
        const ns = { ...s, street: s.street + 1 };
        const norder = actionOrder(ns, ns.street);
        return { ...ns, actingSeat: norder[0] ?? null };
      }
      // fin del river -> nueva mano
      const button = advanceButton(s);
      const nh = { ...s, buttonSeat: button, street: 0 };
      return { ...nh, actingSeat: preflopStart(nh), handNumber: s.handNumber + 1 };
    });
  }, []);

  // Turno anterior (reversa del flujo)
  const prevTurn = useCallback(() => {
    setState(s => {
      const order = actionOrder(s, s.street);
      if (order.length === 0) return s;
      const i = s.actingSeat == null ? -1 : order.indexOf(s.actingSeat);
      if (i > 0) return { ...s, actingSeat: order[i - 1] };
      if (s.street > 0) {
        const ps = { ...s, street: s.street - 1 };
        const porder = actionOrder(ps, ps.street);
        return { ...ps, actingSeat: porder[porder.length - 1] ?? null };
      }
      return s; // inicio de la mano: no retrocede más
    });
  }, []);

  const setShotClock = useCallback((v: number) => {
    setState(s => ({ ...s, shotClockSeconds: v }));
  }, []);

  const clearTable = useCallback(() => {
    setState(s => ({
      ...s,
      players: [],
      buttonSeat: null,
      actingSeat: null,
      street: 0,
      handNumber: 1,
      log: [],
    }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
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
      setShotClock,
      resetCashouts,
      clearTable,
    }),
    [
      state,
      ready,
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
      setShotClock,
      resetCashouts,
      clearTable,
    ],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
};

export const useSession = (): Ctx => {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
};
