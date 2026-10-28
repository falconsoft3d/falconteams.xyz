import Link from "next/link";
import { ABSENCE_TYPES, type AbsenceType } from "@/lib/absences";
import { DICTIONARIES, translator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { formatHours, isWeekend, monthGrid, monthLabel, monthParam, shiftMonth, type Month } from "@/lib/time";


type Props = {
  month: Month;
  totals: Map<string, number>;
  today: string;
  /** Ruta base para los enlaces de mes anterior/siguiente. */
  basePath: string;
  /** Marcar en rojo los días laborables pasados sin fichajes (vista de un empleado). */
  showMissed?: boolean;
  /** Días con algún fichaje cerrado por el autocierre. */
  autoClosedDays?: Set<string>;
  /** Si se indica, cada día enlaza a su detalle (ajustar horas, marcar ausencias). */
  dayHref?: (key: string) => string;
  /** Ausencias del mes por día. */
  absences?: Map<string, AbsenceType>;
};

function cellStyle(key: string, ms: number, today: string, showMissed: boolean, absence?: AbsenceType) {
  const hours = ms / 3600000;
  if (absence && ms === 0) return ABSENCE_TYPES[absence].cell;
  if (hours >= 8) return "border-teal-600 bg-teal-600 text-white";
  if (hours >= 4) return "border-teal-300 bg-teal-200 text-teal-950";
  if (hours > 0) return "border-teal-200 bg-teal-50 text-teal-900";
  if (showMissed && key < today && !isWeekend(key)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (isWeekend(key)) return "border-transparent bg-slate-100/70 text-slate-400";
  return "border-slate-100 bg-white text-slate-400";
}

export async function MonthCalendar({ month, totals, today, basePath, showMissed = false, autoClosedDays, dayHref, absences }: Props) {
  const locale = await getLocale();
  const t = translator(locale);
  const link = (m: Month) => `${basePath}?month=${monthParam(m)}`;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href={link(shiftMonth(month, -1))} className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100" aria-label={t("calendar.prev")}>
          ←
        </Link>
        <h3 className="font-semibold text-slate-900">{monthLabel(month, locale)}</h3>
        <Link href={link(shiftMonth(month, 1))} className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100" aria-label={t("calendar.next")}>
          →
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {DICTIONARIES[locale].calendar.weekdays.map((d, i) => (
          <div key={i} className="pb-1 text-xs font-medium text-slate-500">
            {d}
          </div>
        ))}
        {monthGrid(month).flat().map((key, i) => {
          if (!key) return <div key={`empty-${i}`} />;
          const ms = totals.get(key) ?? 0;
          const absence = absences?.get(key);
          const missed = showMissed && ms === 0 && !absence && key < today && !isWeekend(key);
          const autoClosed = autoClosedDays?.has(key);
          const title = [
            key,
            ms ? formatHours(ms) : missed ? t("calendar.missed") : null,
            absence ? t(`absences.${absence}`) : null,
            autoClosed ? t("calendar.autoClose") : null,
          ].filter(Boolean).join(" · ");
          const className = `relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm ${cellStyle(key, ms, today, showMissed, absence)} ${key === today ? "ring-2 ring-amber-400" : ""}`;
          const content = (
            <>
              <span className="font-medium">{Number(key.slice(8))}</span>
              {ms > 0 && <span className="text-[10px] leading-tight sm:text-xs">{formatHours(ms)}</span>}
              {missed && <span className="text-[10px] leading-tight sm:text-xs" aria-label={t("calendar.missed")}>✗</span>}
              {absence && (
                <span className={ms ? "absolute left-0.5 top-0 text-[10px]" : "text-xs leading-tight"} aria-label={t(`absences.${absence}`)}>
                  {ABSENCE_TYPES[absence].emoji}
                </span>
              )}
              {autoClosed && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-500" aria-label={t("calendar.autoClose")} />}
            </>
          );
          if (dayHref) {
            return (
              <Link
                key={key}
                href={dayHref(key)}
                title={`${title} · ${t("calendar.clickHint")}`}
                className={`${className} transition hover:scale-105 hover:shadow-md focus-visible:outline-2 focus-visible:outline-teal-700`}
              >
                {content}
              </Link>
            );
          }
          return (
            <div key={key} title={title} className={className}>
              {content}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1"><i className="size-3 rounded bg-teal-50 ring-1 ring-teal-200" /> {t("calendar.lt4")}</span>
        <span className="flex items-center gap-1"><i className="size-3 rounded bg-teal-200" /> {t("calendar.h4to8")}</span>
        <span className="flex items-center gap-1"><i className="size-3 rounded bg-teal-600" /> {t("calendar.gte8")}</span>
        {showMissed && <span className="flex items-center gap-1"><i className="size-3 rounded bg-rose-50 ring-1 ring-rose-200" /> {t("calendar.missed")}</span>}
        {absences && (Object.keys(ABSENCE_TYPES) as AbsenceType[]).map((type) => (
          <span key={type} className="flex items-center gap-1">{ABSENCE_TYPES[type].emoji} {t(`absences.${type}`).toLowerCase()}</span>
        ))}
        <span className="flex items-center gap-1"><i className="size-3 rounded bg-slate-100" /> {t("calendar.weekend")}</span>
        {autoClosedDays && <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-amber-500" /> {t("calendar.autoClose")}</span>}
        <span className="flex items-center gap-1"><i className="size-3 rounded ring-2 ring-amber-400" /> {t("calendar.today")}</span>
      </div>
    </div>
  );
}
