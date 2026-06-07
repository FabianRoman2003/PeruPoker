import { Player, SessionState } from '../types';

// Asientos que están jugando esta mano, en orden circular por nº de asiento
export function activeSeats(players: Player[]): number[] {
  return players
    .filter(p => p.status === 'juega')
    .map(p => p.seat)
    .sort((a, b) => a - b);
}

// Siguiente asiento activo en sentido horario después de `fromSeat`
export function nextActiveSeat(fromSeat: number, active: number[]): number | null {
  if (active.length === 0) return null;
  const greater = active.filter(s => s > fromSeat);
  return greater.length ? greater[0] : active[0];
}

export interface Positions {
  button: number | null;
  sb: number | null;
  bb: number | null;
  utg: number | null; // primero en hablar preflop
}

// Calcula botón / ciega pequeña / ciega grande / primero en hablar.
// Maneja la excepción heads-up (2 jugadores: el botón es la ciega pequeña).
export function positions(state: SessionState): Positions {
  const active = activeSeats(state.players);
  if (active.length < 2) {
    return { button: active[0] ?? null, sb: null, bb: null, utg: null };
  }
  // Asegura que el botón esté sobre un asiento activo
  let button = state.buttonSeat;
  if (button == null || !active.includes(button)) button = active[0];

  if (active.length === 2) {
    const bb = nextActiveSeat(button, active);
    return { button, sb: button, bb, utg: button }; // heads-up: SB actúa 1ro preflop
  }
  const sb = nextActiveSeat(button, active);
  const bb = nextActiveSeat(sb!, active);
  const utg = nextActiveSeat(bb!, active);
  return { button, sb, bb, utg };
}

// Avanza el botón una mano (al siguiente asiento que juega)
export function advanceButton(state: SessionState): number | null {
  const active = activeSeats(state.players);
  if (active.length === 0) return null;
  const current = state.buttonSeat ?? active[active.length - 1];
  return nextActiveSeat(current, active);
}

// Orden de los próximos dealers empezando por el botón actual
export function dealerOrder(state: SessionState): number[] {
  const active = activeSeats(state.players);
  const button = positions(state).button;
  if (button == null) return active;
  const start = active.indexOf(button);
  return [...active.slice(start), ...active.slice(0, start)];
}

// ¿En cuántas manos le toca el botón a este asiento? (0 = ahora mismo)
export function handsUntilButton(seat: number, state: SessionState): number {
  const order = dealerOrder(state);
  const idx = order.indexOf(seat);
  return idx < 0 ? -1 : idx;
}

// ====== Flujo de acción de Texas Hold'em ======
export const STREET_NAMES = ['Preflop', 'Flop', 'Turn', 'River'];

// Primero en hablar PREFLOP = el de después de la ciega grande (UTG)
export function preflopStart(state: SessionState): number | null {
  const active = activeSeats(state.players);
  if (active.length === 0) return null;
  const p = positions(state);
  if (p.bb == null) return active[0];
  return nextActiveSeat(p.bb, active);
}

// Primero en hablar POSTFLOP = el de después del botón (la ciega pequeña)
export function postflopStart(state: SessionState): number | null {
  const active = activeSeats(state.players);
  if (active.length === 0) return null;
  const p = positions(state);
  if (p.button == null) return active[0];
  return nextActiveSeat(p.button, active);
}

// Orden de acción de la calle (lista circular de asientos que juegan)
export function actionOrder(state: SessionState, street: number): number[] {
  const active = activeSeats(state.players);
  if (active.length === 0) return [];
  const start = street === 0 ? preflopStart(state) : postflopStart(state);
  if (start == null) return active;
  const i = active.indexOf(start);
  if (i < 0) return active;
  return [...active.slice(i), ...active.slice(0, i)];
}
