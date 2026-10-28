import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { EmployeeShell } from "@/components/employee-shell";
import { LiveTimer } from "@/components/live-timer";
import { Loading } from "@/components/loading";
import { btnDanger, btnPrimary, btnSecondary, btnSmall, card, input, label, pageTitle } from "@/components/ui";
import { ABSENCE_TYPES } from "@/lib/absences";
import { AllocationRows } from "@/components/allocation-rows";
import { clearAbsence, deleteDayEntry, markAbsence, saveDayEntry, saveEntryAllocations } from "@/lib/actions";
import { getAbsence, listDayEntries, listMonthAllocations, projectOptions } from "@/lib/data";
import { requestNow } from "@/lib/now";
import { requireCompanyEmployee } from "@/lib/session";
import { dayKey, durationMs, formatDayKey, formatDuration, formatTime, isDayKey, isWeekend, shiftDay } from "@/lib/time";

export default function DayPage(props: PageProps<"/[company]/day/[date]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Day {...props} />
    </Suspense>
  );
}

async function Day({ params }: PageProps<"/[company]/day/[date]">) {
  const { company: slug, date } = await params;
  const { user, company } = await requireCompanyEmployee(slug);
  const now = await requestNow();
  const today = dayKey(now);
  // Días futuros (hasta un año) solo para planificar ausencias.
  if (!isDayKey(date) || date > shiftDay(today, 366)) notFound();
  const isFuture = date > today;

  const [year, monthNum] = date.split("-").map(Number);
  const [entries, absence, projects, allocations] = await Promise.all([
    isFuture ? [] : listDayEntries(user.userId, date),
    getAbsence(user.userId, date),
    projectOptions(company.id),
    listMonthAllocations(company.id, { year, month: monthNum }, user.userId),
  ]);
  const total = entries.reduce((sum, e) => sum + durationMs(e, now), 0);
  const base = `/${slug}/day`;
  const hidden = (
    <>
      <input type="hidden" name="company" value={slug} />
    </>
  );

  return (
    <EmployeeShell user={user} company={company}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/${slug}?month=${date.slice(0, 7)}`} className="text-sm text-slate-500 hover:text-teal-700">
          ← Volver al calendario
        </Link>
        <nav className="flex gap-2 text-sm">
          <Link href={`${base}/${shiftDay(date, -1)}`} className={`${btnSecondary} ${btnSmall}`}>← Día anterior</Link>
          <Link href={`${base}/${shiftDay(date, 1)}`} className={`${btnSecondary} ${btnSmall}`}>Día siguiente →</Link>
        </nav>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className={`${pageTitle} capitalize`}>{formatDayKey(date)}</h1>
        <p className="text-slate-600">
          Total del día: <strong className="text-slate-900">{formatDuration(total)}</strong>
        </p>
      </div>
      <section className={`${card} ${absence ? ABSENCE_TYPES[absence.type].cell : ""}`}>
        {absence ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">
                {ABSENCE_TYPES[absence.type].emoji} {ABSENCE_TYPES[absence.type].label}
              </p>
              {absence.note && <p className="text-sm opacity-80">{absence.note}</p>}
            </div>
            <ActionForm action={clearAbsence} className="flex flex-col items-end gap-1">
              {hidden}
              <input type="hidden" name="day" value={date} />
              <button className={`${btnSecondary} ${btnSmall}`}>Quitar ausencia</button>
            </ActionForm>
          </div>
        ) : (
          <>
            <h2 className="mb-3 font-semibold text-slate-900">Marcar ausencia</h2>
            <ActionForm action={markAbsence} className="grid gap-3 sm:grid-cols-3">
              {hidden}
              <input type="hidden" name="day" value={date} />
              <div>
                <label htmlFor="absence-type" className={label}>Motivo</label>
                <select id="absence-type" name="type" required defaultValue="" className={input}>
                  <option value="" disabled>Elige…</option>
                  {Object.entries(ABSENCE_TYPES).map(([value, t]) => (
                    <option key={value} value={value}>{t.emoji} {t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="absence-until" className={label}>Hasta (opcional)</label>
                <input id="absence-until" name="until" type="date" min={date} className={input} />
              </div>
              <div>
                <label htmlFor="absence-note" className={label}>Nota (opcional)</label>
                <input id="absence-note" name="note" maxLength={500} className={input} />
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
                <button className={`${btnPrimary} ${btnSmall}`}>Guardar ausencia</button>
                <span className="text-xs text-slate-500">
                  Con «Hasta» se marcan todos los días laborables del rango{isWeekend(date) ? "" : " (los fines de semana se saltan)"}.
                </span>
              </div>
            </ActionForm>
          </>
        )}
      </section>

      {isFuture ? (
        <p className="text-sm text-slate-500">Es un día futuro: solo puedes marcar ausencias.</p>
      ) : (
      <>
      <p className="text-sm text-slate-500">
        Corrige las horas de entrada y salida o añade un tramo que olvidaste fichar. Los cambios quedan marcados como
        <span className="mx-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">editado</span>
        y los ve tu administrador.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {entries.map((e, i) =>
          e.clock_out ? (
            <section key={e.id} className={card}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Tramo {i + 1}</h2>
                <span className="text-sm text-slate-500">
                  {formatDuration(durationMs(e, now))}
                  {e.edited && <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">editado</span>}
                  {e.auto_closed && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">autocierre</span>}
                </span>
              </div>
              <ActionForm action={saveDayEntry} className="grid grid-cols-2 gap-3">
                {hidden}
                <input type="hidden" name="entry_id" value={e.id} />
                <div>
                  <label className={label} htmlFor={`in-${e.id}`}>Entrada</label>
                  <input id={`in-${e.id}`} name="clock_in" type="time" required defaultValue={formatTime(e.clock_in)} className={input} />
                </div>
                <div>
                  <label className={label} htmlFor={`out-${e.id}`}>Salida</label>
                  <input id={`out-${e.id}`} name="clock_out" type="time" required defaultValue={formatTime(e.clock_out)} className={input} />
                </div>
                <div className="col-span-2">
                  <label className={label} htmlFor={`notes-${e.id}`}>Qué hiciste</label>
                  <textarea id={`notes-${e.id}`} name="notes" rows={2} maxLength={2000} defaultValue={e.notes ?? ""} className={input} />
                </div>
                <div className="col-span-2">
                  <button className={`${btnPrimary} ${btnSmall}`}>Guardar cambios</button>
                </div>
              </ActionForm>
              {projects.length > 0 && (
                <ActionForm action={saveEntryAllocations} className="mt-3 space-y-2">
                  {hidden}
                  <input type="hidden" name="entry_id" value={e.id} />
                  <AllocationRows projects={projects} initial={allocations.filter((a) => a.entry_id === e.id)} />
                  <button className={`${btnSecondary} ${btnSmall}`}>Guardar reparto</button>
                </ActionForm>
              )}
              <ActionForm action={deleteDayEntry} className="mt-2 flex flex-wrap justify-end gap-2">
                {hidden}
                <input type="hidden" name="entry_id" value={e.id} />
                <button className={`${btnDanger} ${btnSmall}`}>Eliminar tramo</button>
              </ActionForm>
            </section>
          ) : (
            <section key={e.id} className={`${card} border-teal-200 bg-teal-50/50`}>
              <h2 className="font-semibold text-slate-900">Tramo {i + 1} · en curso</h2>
              <p className="mt-2 text-slate-600">
                Entrada a las {formatTime(e.clock_in)} · <strong className="text-teal-800"><LiveTimer since={e.clock_in} /></strong>
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Registra la salida desde <Link href={`/${slug}`} className="text-teal-700 hover:underline">tu panel</Link> para poder ajustarlo.
              </p>
            </section>
          ),
        )}

        <section className={`${card} border-dashed`}>
          <h2 className="mb-3 font-semibold text-slate-900">{entries.length ? "Añadir otro tramo" : "Añadir horas trabajadas"}</h2>
          <ActionForm action={saveDayEntry} className="grid grid-cols-2 gap-3">
            {hidden}
            <input type="hidden" name="day" value={date} />
            <div>
              <label className={label} htmlFor="new-in">Entrada</label>
              <input id="new-in" name="clock_in" type="time" required className={input} />
            </div>
            <div>
              <label className={label} htmlFor="new-out">Salida</label>
              <input id="new-out" name="clock_out" type="time" required className={input} />
            </div>
            <div className="col-span-2">
              <label className={label} htmlFor="new-notes">Qué hiciste (opcional)</label>
              <textarea id="new-notes" name="notes" rows={2} maxLength={2000} className={input} />
            </div>
            <div className="col-span-2">
              <button className={`${btnPrimary} ${btnSmall}`}>Añadir</button>
            </div>
          </ActionForm>
        </section>
      </div>
      </>
      )}
    </EmployeeShell>
  );
}
