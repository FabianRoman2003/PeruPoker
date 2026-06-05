import { Player, Transaction } from '../types';

export interface Net {
  name: string;
  net: number; // + ganó, - perdió
}

// Dinero total que entró a la mesa (todas las cajas)
export function totalMoney(players: Player[], boxValue: number): number {
  return players.reduce((s, p) => s + p.buyins * boxValue, 0);
}

// Total contado en fichas al final
export function totalCashout(players: Player[]): number {
  return players.reduce((s, p) => s + (p.cashout ?? 0), 0);
}

// Descuadre: +sobra / -falta. Debe ser 0 para poder cerrar limpio.
export function mismatch(players: Player[], boxValue: number): number {
  return totalCashout(players) - totalMoney(players, boxValue);
}

// Neto de cada jugador = fichas finales - lo que metió
export function nets(players: Player[], boxValue: number): Net[] {
  return players
    .filter(p => p.cashout != null)
    .map(p => ({ name: p.name, net: (p.cashout as number) - p.buyins * boxValue }));
}

// Quién le paga a quién, con el MÍNIMO de transferencias (greedy)
export function settle(players: Player[], boxValue: number): Transaction[] {
  const creditors = nets(players, boxValue)
    .filter(n => n.net > 0)
    .map(n => ({ ...n }))
    .sort((a, b) => b.net - a.net);
  const debtors = nets(players, boxValue)
    .filter(n => n.net < 0)
    .map(n => ({ name: n.name, net: -n.net })) // monto que debe (positivo)
    .sort((a, b) => b.net - a.net);

  const txs: Transaction[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].net, creditors[j].net);
    if (pay > 0) {
      txs.push({ from: debtors[i].name, to: creditors[j].name, amount: pay });
    }
    debtors[i].net -= pay;
    creditors[j].net -= pay;
    if (debtors[i].net <= 0.0001) i++;
    if (creditors[j].net <= 0.0001) j++;
  }
  return txs;
}
