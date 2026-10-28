import type { InvoiceItem, Profile, TimeEntry } from "./data";
import { billableHours, costOf } from "./money";
import { monthParam, totalsByDay, type Month } from "./time";

// La factura de cada empleado no se guarda: se calcula al vuelo para el mes con
// sus fichajes cerrados (así va acumulando las horas a medida que trabaja) más
// los conceptos extra que añadan el empleado o el admin (equipos, gastos…).

export type InvoiceLine = { id: number; description: string; quantity: number; unitPrice: number; amount: number };

export type InvoiceTotals = {
  number: string;
  month: Month;
  /** Horas por día ("YYYY-MM-DD" → ms), en orden cronológico. */
  days: [string, number][];
  hours: number;
  rate: number | null;
  /** Importe de las horas (null sin coste por hora). */
  amount: number | null;
  items: InvoiceLine[];
  itemsTotal: number;
  /** Horas + conceptos. */
  total: number;
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function invoiceTotals(profile: Profile, entries: TimeEntry[], month: Month, now: Date, items: InvoiceItem[] = []): InvoiceTotals {
  const closed = entries.filter((e) => e.user_id === profile.user_id && e.clock_out);
  const days = [...totalsByDay(closed, now).entries()].sort(([a], [b]) => a.localeCompare(b));
  const totalMs = days.reduce((sum, [, ms]) => sum + ms, 0);
  const rate = profile.hourly_rate;
  const amount = rate === null ? null : costOf(totalMs, rate);
  const lines = items
    .filter((i) => i.user_id === profile.user_id)
    .map((i) => {
      const quantity = Number(i.quantity);
      const unitPrice = Number(i.unit_price);
      return { id: i.id, description: i.description, quantity, unitPrice, amount: cents(quantity * unitPrice) };
    });
  const itemsTotal = cents(lines.reduce((s, l) => s + l.amount, 0));
  return {
    number: `${monthParam(month)}-${String(profile.id).padStart(3, "0")}`,
    month,
    days,
    hours: billableHours(totalMs),
    rate,
    amount,
    items: lines,
    itemsTotal,
    total: cents((amount ?? 0) + itemsTotal),
  };
}
