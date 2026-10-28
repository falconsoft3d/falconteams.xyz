import { Avatar } from "./avatar";
import { ClockForm } from "./clock-form";
import { LiveTimer } from "./live-timer";
import { card } from "./ui";
import type { ProjectOption, TimeEntry } from "@/lib/data";
import { DICTIONARIES, translator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { formatDate, formatDuration, formatTime } from "@/lib/time";

/** Tarjeta de fichaje: estado actual y botón de entrada/salida. */
export async function ClockCard({ slug, open, todayClosedMs, now, autoCloseHours, geo, projects, person }: {
  /** Empresa desde la que se ficha; el admin ficha sin empresa. */
  slug?: string;
  open: TimeEntry | null;
  todayClosedMs: number;
  now: Date;
  /** Horas de autocierre de la empresa, o null si está desactivado. */
  autoCloseHours: number | null;
  /** Pedir la ubicación del navegador al fichar. */
  geo: boolean;
  projects?: ProjectOption[];
  /** Quién ficha: se muestra su foto (o iniciales) y su nombre. */
  person?: { name: string; avatarUrl: string | null };
}) {
  const locale = await getLocale();
  const t = translator(locale);
  return (
    <section className={`${card} flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex items-start gap-4">
        {person && <Avatar name={person.name} url={person.avatarUrl} size="size-16 text-lg" />}
      <div>
        {person && <p className="font-semibold text-slate-900">{person.name}</p>}
        <p className="text-sm capitalize text-slate-500">{formatDate(now, locale)}</p>
        {open ? (
          <>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-teal-800">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-500 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-teal-600" />
              </span>
              {t("clock.workingSince", { time: formatTime(open.clock_in) })}
            </p>
            <p className="mt-2 text-4xl font-bold text-slate-900">
              <LiveTimer since={open.clock_in} />
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {t("clock.totalToday")} <LiveTimer since={open.clock_in} baseMs={todayClosedMs} />
            </p>
            {autoCloseHours && (
              <p className="mt-2 text-xs text-amber-700">
                {t("clock.autoClose", { time: formatTime(new Date(new Date(open.clock_in).getTime() + autoCloseHours * 3600000)) })}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-1 text-lg font-semibold text-slate-700">{t("clock.outOfShift")}</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{formatDuration(todayClosedMs)}</p>
            <p className="mt-1 text-sm text-slate-500">{t("clock.workedToday")}</p>
          </>
        )}
      </div>
      </div>
      <ClockForm
        key={open ? "out" : "in"}
        open={!!open}
        geo={geo}
        slug={slug}
        projects={projects}
        labels={DICTIONARIES[locale].clock}
        allocLabels={DICTIONARIES[locale].alloc}
      />
    </section>
  );
}
