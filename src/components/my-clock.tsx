import { ClockCard } from "./clock-card";
import { getOpenEntry, listMonthEntries, projectOptions } from "@/lib/data";
import { dayKey, durationMs, parseMonth } from "@/lib/time";

/** Carga el estado de fichaje del usuario y muestra su tarjeta de entrada/salida. */
export async function MyClock({ userId, slug, autoCloseHours, now, geo = false, companyId, person }: {
  userId: number;
  /** Foto y nombre de quien ficha. */
  person?: { name: string; avatarUrl: string | null };
  /** Empresa del empleado: sus proyectos se ofrecen al registrar la salida. */
  companyId?: number;
  geo?: boolean;
  slug?: string;
  autoCloseHours: number | null;
  now: Date;
}) {
  const [open, entries, projects] = await Promise.all([
    getOpenEntry(userId),
    listMonthEntries(parseMonth(undefined, now), { userId }),
    companyId ? projectOptions(companyId) : [],
  ]);
  const today = dayKey(now);
  const todayClosedMs = entries
    .filter((e) => e.clock_out && dayKey(e.clock_in) === today)
    .reduce((sum, e) => sum + durationMs(e, now), 0);
  return <ClockCard slug={slug} open={open} todayClosedMs={todayClosedMs} now={now} autoCloseHours={autoCloseHours} geo={geo} projects={projects} person={person} />;
}
