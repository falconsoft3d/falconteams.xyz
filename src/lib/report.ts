import "server-only";
import { CURRENCY, costOf } from "./money";
import type { Company, Profile, TimeEntry } from "./data";
import { dayKey, durationMs, formatTime, monthLabel, monthParam, totalsByDay, type Month } from "./time";

// Informes mensuales en CSV con ";" y BOM UTF-8 para que Excel en español
// los abra directamente con tildes y decimales con coma.

type Cell = string | number | null | undefined;

function cell(value: Cell) {
  if (value === null || value === undefined) return "";
  let text = typeof value === "number" ? value.toFixed(2).replace(".", ",") : value;
  // Evita que un texto escrito por el usuario se ejecute como fórmula en Excel.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Cell[][]) {
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

const hours = (ms: number) => ms / 3600000;
const hhmm = (ms: number) => {
  const m = Math.floor(ms / 60000);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};
const date = (key: string) => key.split("-").reverse().join("/");
const rateOf = (p: Profile) => (p.hourly_rate === null ? null : Number(p.hourly_rate));

function entryRows(entries: TimeEntry[], now: Date, withName?: Map<number, Profile>) {
  return entries.map((e) => {
    const ms = durationMs(e, now);
    const name = withName?.get(e.user_id);
    return [
      ...(withName ? [name?.full_name || name?.email || `Usuario ${e.user_id}`] : []),
      date(dayKey(e.clock_in)),
      formatTime(e.clock_in),
      e.clock_out ? formatTime(e.clock_out) : "en curso",
      hours(ms),
      hhmm(ms),
      e.auto_closed ? "sí" : "",
      e.notes,
    ];
  });
}

const ENTRY_HEADER = ["Fecha", "Entrada", "Salida", "Horas", "Duración (h:mm)", "Autocierre", "Notas"];

/** Informe de un empleado: un fichaje por fila y totales del mes. */
export function employeeReport(input: {
  profile: Profile;
  company: Company | null;
  month: Month;
  entries: TimeEntry[];
  now: Date;
  withCost: boolean;
}) {
  const { profile, company, month, entries, now, withCost } = input;
  const totals = totalsByDay(entries, now);
  const totalMs = [...totals.values()].reduce((a, b) => a + b, 0);
  const rate = rateOf(profile);

  const rows: Cell[][] = [
    ["Informe de horas", monthLabel(month)],
    ["Empleado", profile.full_name || profile.email],
    ["Email", profile.email],
    ["Empresa", company?.name ?? "—"],
    [],
    ENTRY_HEADER,
    ...entryRows(entries, now),
    [],
    ["Días trabajados", String(totals.size)],
    ["Total horas", hours(totalMs)],
    ["Total (h:mm)", hhmm(totalMs)],
  ];
  if (withCost) {
    rows.push([`Coste por hora (${CURRENCY})`, rate]);
    rows.push([`Coste total (${CURRENCY})`, rate === null ? "sin coste por hora" : costOf(totalMs, rate)]);
  }
  const name = slugPart(profile.full_name || profile.email);
  return { csv: toCsv(rows), filename: `horas-${name}-${monthParam(month)}.csv` };
}

/** Informe de una empresa: resumen por empleado con costes y detalle de fichajes. */
export function companyReport(input: {
  company: Company;
  month: Month;
  employees: Profile[];
  entries: TimeEntry[];
  now: Date;
}) {
  const { company, month, employees, entries, now } = input;
  const profiles = new Map(employees.map((p) => [p.user_id, p]));
  let totalMs = 0;
  let totalCost = 0;

  const summary = employees.map((p) => {
    const mine = entries.filter((e) => e.user_id === p.user_id);
    const ms = mine.reduce((s, e) => s + durationMs(e, now), 0);
    const rate = rateOf(p);
    const cost = rate === null ? null : costOf(ms, rate);
    totalMs += ms;
    totalCost += cost ?? 0;
    return [p.full_name || p.email, p.email, String(totalsByDay(mine, now).size), hours(ms), hhmm(ms), rate, cost];
  });

  const rows: Cell[][] = [
    ["Informe de horas", monthLabel(month)],
    ["Empresa", company.name],
    [],
    ["Empleado", "Email", "Días trabajados", "Horas", "Total (h:mm)", `Coste/hora (${CURRENCY})`, `Coste (${CURRENCY})`],
    ...summary,
    ["TOTAL", "", "", hours(totalMs), hhmm(totalMs), "", totalCost],
    [],
    ["Detalle de fichajes"],
    ["Empleado", ...ENTRY_HEADER],
    ...entryRows(entries, now, profiles),
  ];
  return { csv: toCsv(rows), filename: `horas-${company.slug}-${monthParam(month)}.csv` };
}

function slugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
