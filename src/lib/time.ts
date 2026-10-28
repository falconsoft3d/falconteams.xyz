// Utilidades de fechas. Los días se calculan en la zona horaria de la empresa
// (APP_TIMEZONE) para que un fichaje a las 00:30 cuente en el día correcto.

import { INTL_LOCALE, type Locale } from "./i18n";

export const TIMEZONE = process.env.APP_TIMEZONE ?? "Europe/Madrid";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});


/** "YYYY-MM-DD" del instante dado, en la zona horaria de la app. */
export function dayKey(date: Date | string) {
  return dayKeyFmt.format(new Date(date));
}

export function formatTime(date: Date | string) {
  return timeFmt.format(new Date(date));
}

export function formatDate(date: Date | string, locale: Locale = "es") {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: TIMEZONE, weekday: "long", day: "numeric", month: "long" }).format(
    new Date(date),
  );
}

/** Formatea un "YYYY-MM-DD" sin desplazarlo por la zona horaria. */
export function formatDayKey(key: string, locale: Locale = "es") {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatHours(ms: number) {
  return `${(ms / 3600000).toFixed(1).replace(".", ",")} h`;
}

type Interval = { clock_in: string; clock_out: string | null };

export function durationMs(entry: Interval, now: Date) {
  const end = entry.clock_out ? new Date(entry.clock_out) : now;
  return Math.max(0, end.getTime() - new Date(entry.clock_in).getTime());
}

/** Suma de horas por día ("YYYY-MM-DD" → ms). El fichaje cuenta en el día de entrada. */
export function totalsByDay(entries: Interval[], now: Date) {
  const totals = new Map<string, number>();
  for (const e of entries) {
    const key = dayKey(e.clock_in);
    totals.set(key, (totals.get(key) ?? 0) + durationMs(e, now));
  }
  return totals;
}

export type Month = { year: number; month: number }; // month: 1-12

export function parseMonth(value: string | undefined, now: Date): Month {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year: Number(match[1]), month };
  }
  const [year, month] = dayKey(now).split("-").map(Number);
  return { year, month };
}

export function monthParam({ year, month }: Month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth({ year, month }: Month, delta: number): Month {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function monthLabel({ year, month }: Month, locale: Locale = "es") {
  const label = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Instante seguro desde el que consultar fichajes del mes: el día anterior en UTC
 * cubre cualquier desfase horario. El resultado se filtra después con dayKey().
 */
export function monthQueryStart({ year, month }: Month) {
  return new Date(Date.UTC(year, month - 1, 0)).toISOString();
}

export function inMonth(key: string, m: Month) {
  return key.startsWith(monthParam(m));
}

/** Semanas del mes (lunes a domingo); null para huecos fuera del mes. */
export function monthGrid({ year, month }: Month) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${monthParam({ year, month })}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Sábado o domingo para un "YYYY-MM-DD". */
export function isWeekend(key: string) {
  const day = new Date(`${key}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Asistencia del mes hasta hoy: días trabajados y días laborables (lunes a
 * viernes) ya pasados sin ningún fichaje. Hoy solo cuenta si ya se ha trabajado.
 * Los días con ausencia (vacaciones, enfermedad, permisos) no cuentan como laborables.
 */
export function attendance(month: Month, totals: Map<string, number>, today: string, absent: Set<string> = new Set()) {
  const days = monthGrid(month).flat().filter((k): k is string => k !== null);
  const worked = days.filter((k) => totals.has(k));
  const expected = (k: string) => !isWeekend(k) && !absent.has(k);
  const missed = days.filter((k) => k < today && expected(k) && !totals.has(k));
  const workdays = days.filter((k) => expected(k) && (k < today || (k === today && totals.has(k))));
  return { worked, missed, workdays };
}

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Desfase (ms) de la zona horaria de la app respecto a UTC en un instante dado. */
function tzOffsetMs(utcMs: number) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(utcMs)).map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - utcMs;
}

/** Instante UTC de una hora "HH:MM" en un día "YYYY-MM-DD" de la zona horaria de la app. */
export function zonedTimeToUtc(key: string, hhmm: string) {
  const [y, m, d] = key.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  const wallClock = Date.UTC(y, m - 1, d, h, min);
  // Dos pasadas para acertar el desfase en los días de cambio de hora.
  const first = wallClock - tzOffsetMs(wallClock);
  return new Date(wallClock - tzOffsetMs(first));
}

export function isDayKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Día anterior o siguiente de un "YYYY-MM-DD". */
export function shiftDay(key: string, delta: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
