"use client";

import { useState } from "react";
import { input } from "./ui";
import type { ProjectOption } from "@/lib/data";
import { DICTIONARIES } from "@/lib/i18n";

type Row = { key: number; project: string; task: string; time: string };

const toTime = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * Filas para repartir horas entre proyectos y tareas. Envía alloc_project,
 * alloc_task y alloc_time (repetidos) dentro del formulario que la contiene.
 */
export function AllocationRows({ projects, initial = [], labels = DICTIONARIES.es.alloc }: {
  projects: ProjectOption[];
  labels?: (typeof DICTIONARIES)["es"]["alloc"];
  initial?: { project_id: number; task_id: number | null; minutes: number }[];
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length
      ? initial.map((a, i) => ({ key: i, project: String(a.project_id), task: a.task_id ? String(a.task_id) : "", time: toTime(a.minutes) }))
      : [{ key: 0, project: "", task: "", time: "" }],
  );
  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const select = `${input} py-1.5!`;

  return (
    <details open={initial.length > 0} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
      <summary className="cursor-pointer text-sm font-medium text-slate-700">{labels.title}</summary>
      <div className="mt-3 space-y-2">
        {rows.map((row) => {
          const tasks = projects.find((p) => String(p.id) === row.project)?.tasks ?? [];
          return (
            <div key={row.key} className="grid grid-cols-[1fr_1fr_4.5rem_auto] gap-1.5">
              <select name="alloc_project" value={row.project} onChange={(e) => update(row.key, { project: e.target.value, task: "" })} aria-label="Proyecto" className={select}>
                <option value="">{labels.project}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select name="alloc_task" value={row.task} onChange={(e) => update(row.key, { task: e.target.value })} disabled={!tasks.length} aria-label="Tarea" className={select}>
                <option value="">{tasks.length ? labels.noTask : "—"}</option>
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input name="alloc_time" value={row.time} onChange={(e) => update(row.key, { time: e.target.value })} placeholder="1:30" aria-label="Tiempo" className={select} />
              <button type="button" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== row.key) : [{ ...row, project: "", task: "", time: "" }]))} className="rounded-lg px-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Quitar fila">
                ✕
              </button>
            </div>
          );
        })}
        <button type="button" onClick={() => setRows((rs) => [...rs, { key: Math.max(...rs.map((r) => r.key)) + 1, project: "", task: "", time: "" }])} className="text-sm font-medium text-teal-700 hover:underline">
          {labels.addRow}
        </button>
        <p className="text-xs text-slate-500">{labels.help}</p>
      </div>
    </details>
  );
}
