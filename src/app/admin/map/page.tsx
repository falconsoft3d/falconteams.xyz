import { Suspense } from "react";
import Link from "next/link";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { Loading } from "@/components/loading";
import { card, pageTitle } from "@/components/ui";
import { listCompanies, listMonthEntries, listProfiles } from "@/lib/data";
import { requestNow } from "@/lib/now";
import { requireAdmin } from "@/lib/session";
import { dayKey, formatDayKey, formatTime, isDayKey, shiftDay } from "@/lib/time";

export default function MapPage(props: PageProps<"/admin/map">) {
  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Mapa de fichajes</h1>
      <Suspense fallback={<Loading />}>
        <FichajesMap {...props} />
      </Suspense>
    </div>
  );
}

const osm = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

async function FichajesMap({ searchParams }: PageProps<"/admin/map">) {
  await requireAdmin();
  const query = await searchParams;
  const now = await requestNow();
  const today = dayKey(now);
  const day = typeof query.day === "string" && isDayKey(query.day) ? query.day : today;
  const companyFilter = Number(query.company) || undefined;
  const [year, month] = day.split("-").map(Number);

  const [entries, profiles, companies] = await Promise.all([
    listMonthEntries({ year, month }, { companyId: companyFilter }),
    listProfiles(),
    listCompanies(),
  ]);
  const name = new Map(profiles.map((p) => [p.user_id, p.full_name || p.email]));
  const located = entries.filter((e) => dayKey(e.clock_in) === day && (e.in_lat !== null || e.out_lat !== null));

  const points: MapPoint[] = [];
  for (const e of located) {
    const who = name.get(e.user_id) ?? `Usuario ${e.user_id}`;
    if (e.in_lat !== null && e.in_lng !== null) {
      points.push({ lat: e.in_lat, lng: e.in_lng, kind: "in", accuracy: e.in_accuracy, label: `${who} · entrada ${formatTime(e.clock_in)}` });
    }
    if (e.out_lat !== null && e.out_lng !== null && e.clock_out) {
      points.push({ lat: e.out_lat, lng: e.out_lng, kind: "out", accuracy: e.out_accuracy, label: `${who} · salida ${formatTime(e.clock_out)}` });
    }
  }
  const link = (d: string, c = companyFilter) => `/admin/map?day=${d}${c ? `&company=${c}` : ""}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Link href={link(shiftDay(day, -1))} className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100" aria-label="Día anterior">←</Link>
          <span className="font-semibold capitalize text-slate-900">{formatDayKey(day)}</span>
          {day < today && <Link href={link(shiftDay(day, 1))} className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100" aria-label="Día siguiente">→</Link>}
        </div>
        {day !== today && <Link href={link(today)} className="text-sm text-teal-700 hover:underline">Hoy</Link>}
        <div className="ml-auto flex flex-wrap gap-1.5 text-sm">
          <Link href={link(day, 0)} className={`rounded-full border px-3 py-1 ${!companyFilter ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-600"}`}>Todas</Link>
          {companies.map((c) => (
            <Link key={c.id} href={link(day, c.id)} className={`rounded-full border px-3 py-1 ${companyFilter === c.id ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-600"}`}>
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      <section className={card}>
        <GeoMap points={points} />
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-teal-700" /> entrada</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-rose-600" /> salida</span>
          <span>El círculo muestra la precisión de la ubicación.</span>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-2 font-semibold text-slate-900">Fichajes con ubicación</h2>
        {located.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay fichajes con ubicación este día. Actívala en la ficha de cada empleado («Pedir ubicación al fichar»).
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {located.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="font-medium text-slate-900">{name.get(e.user_id) ?? `Usuario ${e.user_id}`}</span>
                <span className="flex gap-3 text-slate-600">
                  {e.in_lat !== null && e.in_lng !== null ? (
                    <a href={osm(e.in_lat, e.in_lng)} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">📍 entrada {formatTime(e.clock_in)}</a>
                  ) : (
                    <span className="text-slate-400">entrada {formatTime(e.clock_in)} sin ubicación</span>
                  )}
                  {e.clock_out && (e.out_lat !== null && e.out_lng !== null ? (
                    <a href={osm(e.out_lat, e.out_lng)} target="_blank" rel="noreferrer" className="text-rose-700 hover:underline">📍 salida {formatTime(e.clock_out)}</a>
                  ) : (
                    <span className="text-slate-400">salida {formatTime(e.clock_out)} sin ubicación</span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
