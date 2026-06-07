// Estados que puede tener un asiento (tu caso del dealer que juega o no)
export type SeatStatus = 'juega' | 'descansa' | 'solo_reparte';

export interface Player {
  id: string;
  seat: number; // 1..9
  name: string;
  status: SeatStatus;
  buyins: number; // cantidad de cajas compradas (cada caja = boxValue)
  cashout: number | null; // fichas finales en Bs (al cerrar la mesa)
  folded?: boolean; // se retiró en la mano actual (se reinicia cada mano)
  lastAction?: 'apuesta' | 'fold' | null; // decisión de la mano actual
}

export interface BuyinEvent {
  id: string;
  playerId: string;
  at: number; // timestamp
}

export interface SessionState {
  boxValue: number; // 20 Bs por caja
  smallBlind: number; // 1
  bigBlind: number; // 2
  shotClockSeconds: number; // 30
  players: Player[];
  buttonSeat: number | null; // asiento con el botón
  actingSeat: number | null; // asiento en acción (reloj)
  street: number; // 0=Preflop, 1=Flop, 2=Turn, 3=River
  handNumber: number;
  log: BuyinEvent[];
  // Reloj basado en marca de tiempo (se sincroniza fluido entre celulares)
  timerRunning: boolean;
  turnStartedAt: number | null; // epoch ms cuando arrancó el conteo actual
  timerBase: number; // segundos restantes al momento de turnStartedAt
}

export type OnlineRole = 'off' | 'host' | 'viewer';

export interface OnlineState {
  role: OnlineRole;
  code: string | null;
  hostName?: string | null;
}

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}
