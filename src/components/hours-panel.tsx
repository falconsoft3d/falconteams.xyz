import type { ReactNode } from "react";
import { EntriesList } from "./entries-list";
import { MonthCalendar } from "./month-calendar";
import { Stat } from "./stat";
import { card } from "./ui";
import { ABSENCE_TYPES, type AbsenceType } from "@/lib/absences";
import type { Absence, TimeEntry } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { costOf, formatMoney } from "@/lib/money";
import { attendance, dayKey, formatDayKey, formatDuration, formatHours, monthLabel, totalsByDay, type Month } from "@/lib/time";

/** Asistencia del mes, calendario y listado de fichajes de un empleado. */
export async function HoursPanel({ entries, month, now, basePath, hourlyRate, actions, dayHref, absences = new Map() }: {
  entries: TimeEntry[];
  month: Month;
  now: Date;
  basePath: string;
  /** Coste por hora (solo vistas de admin). undefined oculta el coste; null = sin fijar. */
  hourlyRate?: number | null;
  /** Botones sobre el calendario (exportar, facturar…). */
  actions?: ReactNode;
  /** Enlace de cada día para ajustar sus horas (solo el propio empleado). */
  dayHref?: (key: string) => string;
  /** Ausencias del mes por día. */
  absences?: Map<string, Absence>;
}) {
  const locale = await getLocale();
  const t = translator(locale);
  const today = dayKey(now);
  const totals = totalsByDay(entries, now);
  const monthMs = [...totals.values()].reduce((a, b) => a + b, 0);
  const absenceTypes = new Map<string, AbsenceType>([...absences].map(([day, a]) => [day, a.type]));
  const { worked, missed, workdays } = attendance(month, totals, today, new Set(absences.keys()));
  const absenceCounts = Object.entries(ABSENCE_TYPES)
    .map(([type, info]) => ({ ...info, label: t(`absences.${type as AbsenceType}`), count: [...absenceTypes.values()].filter((v) => v === type).length }))
    .filter((t) => t.count > 0);
  const autoClosedDays = new Set(entries.filter((e) => e.auto_closed).map((e) => dayKey(e.clock_in)));
  const pct = workdays.length ? Math.round((workdays.filter((k) => totals.has(k)).length / workdays.length) * 100) : null;

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-2 gap-4 ${hourlyRate === undefined ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}>
        <Stat label={t("hours.monthHours")} value={formatHours(monthMs)} hint={monthLabel(month, locale)} />
        <Stat label={t("hours.daysWorked")} value={worked.length} hint={workdays.length ? t("hours.ofWorkdays", { n: workdays.length }) : undefined} />
        <Stat label={t("hours.daysMissed")} value={missed.length} hint={t("hours.missedHint")} />
        <Stat label={t("hours.avgPerDay")} value={worked.length ? formatDuration(monthMs / worked.length) : "—"} />
        {hourlyRate !== undefined && (
          <Stat
            label={t("hours.costToPay")}
            value={hourlyRate === null ? "—" : formatMoney(costOf(monthMs, hourlyRate))}
            hint={hourlyRate === null ? t("hours.noRate") : t("hours.perHour", { rate: formatMoney(hourlyRate) })}
          />
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={card}>
          {actions && <div className="mb-4 flex flex-wrap justify-end gap-2 border-b border-slate-100 pb-4">{actions}</div>}
          <MonthCalendar
            month={month}
            totals={totals}
            today={today}
            basePath={basePath}
            showMissed
            autoClosedDays={autoClosedDays}
            dayHref={dayHref}
            absences={absenceTypes}
          />
          {dayHref && <p className="mt-2 text-xs text-slate-500">{t("hours.clickDay")}</p>}
          {absenceCounts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {absenceCounts.map((a) => (
                <span key={a.label} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${a.cell}`}>
                  {a.emoji} {a.label}: {a.count} {a.count === 1 ? t("hours.day") : t("hours.days")}
                </span>
              ))}
            </div>
          )}
          {pct !== null && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium text-slate-700">{t("hours.attendance")}</span>
                <span className="tabular-nums text-slate-600">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-rose-100">
                <div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
              </div>
              {missed.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-sm text-slate-600">{t("hours.missedList")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missed.map((k) => (
                      <span key={k} className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs capitalize text-rose-700">
                        {formatDayKey(k, locale)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        <section className={card}>
          <h3 className="mb-1 font-semibold text-slate-900">{t("hours.entries")}</h3>
          <EntriesList entries={entries} now={now} />
        </section>
      </div>
    </div>
  );
}
