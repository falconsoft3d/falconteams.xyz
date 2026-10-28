import { MoreDays } from "./more-days";
import type { TimeEntry } from "@/lib/data";
import { DICTIONARIES, translator, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { dayKey, durationMs, formatDayKey, formatDuration, formatTime } from "@/lib/time";

/** Días que se muestran sin desplegar; el resto queda tras "Ver más". */
const VISIBLE_DAYS = 3;
/** Días por página dentro de "Ver más". */
const PAGE_SIZE = 10;

const osmLink = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

/** Fichajes agrupados por día, del más reciente al más antiguo. */
export async function EntriesList({ entries, now }: { entries: TimeEntry[]; now: Date }) {
  const locale = await getLocale();
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">{translator(locale)("entries.none")}</p>;
  }
  const byDay = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    const key = dayKey(e.clock_in);
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => b.localeCompare(a));
  const visible = days.slice(0, VISIBLE_DAYS);
  const hidden = days.slice(VISIBLE_DAYS);

  return (
    <div>
      <DayList days={visible} now={now} locale={locale} />
      {hidden.length > 0 && (
        <MoreDays
          total={hidden.length}
          firstIndex={VISIBLE_DAYS + 1}
          pageSize={PAGE_SIZE}
          labels={DICTIONARIES[locale].entries}
          pages={Array.from({ length: Math.ceil(hidden.length / PAGE_SIZE) }, (_, i) => (
            <DayList key={i} days={hidden.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE)} now={now} locale={locale} />
          ))}
        />
      )}
    </div>
  );
}

function DayList({ days, now, locale }: { days: [string, TimeEntry[]][]; now: Date; locale: Locale }) {
  const t = translator(locale);
  return (
    <ul className="divide-y divide-slate-100">
      {days.map(([key, list]) => {
        const total = list.reduce((sum, e) => sum + durationMs(e, now), 0);
        return (
          <li key={key} className="py-3">
            <div className="flex items-baseline justify-between">
              <span className="font-medium capitalize text-slate-900">{formatDayKey(key, locale)}</span>
              <span className="text-sm font-semibold text-slate-700">{formatDuration(total)}</span>
            </div>
            <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
              {list.map((e) => (
                <li key={e.id} className="tabular-nums">
                  {formatTime(e.clock_in)} → {e.clock_out ? formatTime(e.clock_out) : <span className="font-medium text-teal-700">{t("entries.inProgress")}</span>}
                  <span className="text-slate-400"> · {formatDuration(durationMs(e, now))}</span>
                  {e.auto_closed && (
                    <span title={t("entries.autoCloseTitle")} className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {t("entries.autoClose")}
                    </span>
                  )}
                  {e.in_lat !== null && e.in_lng !== null && (
                    <a href={osmLink(e.in_lat, e.in_lng)} target="_blank" rel="noreferrer" title="Ubicación de la entrada" className="ml-2 text-xs text-teal-700 hover:underline">
                      {t("entries.locIn")}
                    </a>
                  )}
                  {e.out_lat !== null && e.out_lng !== null && (
                    <a href={osmLink(e.out_lat, e.out_lng)} target="_blank" rel="noreferrer" title="Ubicación de la salida" className="ml-2 text-xs text-rose-700 hover:underline">
                      {t("entries.locOut")}
                    </a>
                  )}
                  {e.edited && (
                    <span title={t("entries.editedTitle")} className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                      {t("entries.edited")}
                    </span>
                  )}
                  {e.notes && (
                    <p className="mt-0.5 whitespace-pre-line border-l-2 border-slate-200 pl-2 text-slate-500">{e.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
