// Estados que puede tener un asiento (tu caso del dealer que juega o no)
export type SeatStatus = 'juega' | 'descansa' | 'solo_reparte';

export interface Player {
  id: string;
  seat: number; // 1..9
  name: string;
  status: SeatStatus;
  buyins: number; // cantidad de cajas compradas (cada caja = boxValue)
  cashout: number | null; // fichas finales en Bs (al cerrar la mesa)
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
  handNumber: number;
  log: BuyinEvent[];
}

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}
