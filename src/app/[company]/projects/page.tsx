import { Suspense } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { btnPrimary, btnSecondary, btnSmall, card, input, label, pageTitle } from "@/components/ui";
import { addTask, saveProject, setProjectActive, setTaskDone } from "@/lib/actions";
import { listEmployees, listMonthAllocations, listProjects, listTasks, type Allocation } from "@/lib/data";
import { requestNow } from "@/lib/now";
import { requireCompanyMember } from "@/lib/session";
import { monthLabel, monthParam, parseMonth, shiftMonth } from "@/lib/time";

export default function ProjectsPage(props: PageProps<"/[company]/projects">) {
  return (
    <Suspense fallback={<Loading />}>
      <Projects {...props} />
    </Suspense>
  );
}

const fmt = (minutes: number) => (minutes ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min` : "—");
const sum = (rows: Allocation[]) => rows.reduce((s, a) => s + a.minutes, 0);

async function Projects({ params, searchParams }: PageProps<"/[company]/projects">) {
  const [{ company: slug }, query] = await Promise.all([params, searchParams]);
  const { user, company, isAdmin } = await requireCompanyMember(slug);
  const now = await requestNow();
  const month = parseMonth(typeof query.month === "string" ? query.month : undefined, now);

  const [projects, tasks, allocations, employees] = await Promise.all([
    listProjects(company.id),
    listTasks(company.id),
    // El empleado ve solo sus horas; el admin, las de todos.
    listMonthAllocations(company.id, month, isAdmin ? undefined : user.userId),
    isAdmin ? listEmployees(company.id) : [],
  ]);
  const visible = isAdmin ? projects : projects.filter((p) => p.active);
  const name = new Map(employees.map((e) => [e.user_id, e.full_name || e.email]));
  const link = (m: typeof month) => `/${slug}/projects?month=${monthParam(m)}`;

  return (
    <EmployeeShell user={user} company={company}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={pageTitle}>Proyectos</h1>
          <p className="mt-1 text-slate-500">
            {isAdmin ? "Horas de todo el equipo" : "Tus horas"} repartidas en {monthLabel(month).toLowerCase()}: <strong className="text-slate-900">{fmt(sum(allocations))}</strong>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={link(shiftMonth(month, -1))} className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100" aria-label="Mes anterior">←</Link>
          <span className="font-semibold text-slate-900">{monthLabel(month)}</span>
          <Link href={link(shiftMonth(month, 1))} className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100" aria-label="Mes siguiente">→</Link>
        </div>
      </div>

      {!isAdmin && (
        <p className="text-sm text-slate-500">
          Reparte tus horas al registrar la salida o, después, desde el día en el calendario de tu Dashboard.
        </p>
      )}

      {isAdmin && (
        <section className={card}>
          <h2 className="mb-3 font-semibold text-slate-900">Nuevo proyecto</h2>
          <ActionForm action={saveProject} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <input type="hidden" name="company_id" value={company.id} />
            <div>
              <label htmlFor="project-name" className={label}>Nombre</label>
              <input id="project-name" name="name" required maxLength={200} placeholder="Implantación Odoo" className={input} />
            </div>
            <div>
              <label htmlFor="project-desc" className={label}>Descripción (opcional)</label>
              <input id="project-desc" name="description" maxLength={2000} className={input} />
            </div>
            <button className={`${btnPrimary} ${btnSmall}`}>Crear proyecto</button>
          </ActionForm>
        </section>
      )}

      {visible.length === 0 ? (
        <p className={`${card} text-sm text-slate-500`}>Todavía no hay proyectos.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((project) => {
            const projectAllocs = allocations.filter((a) => a.project_id === project.id);
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            const byEmployee = [...new Set(projectAllocs.map((a) => a.user_id))].map((uid) => ({
              uid,
              minutes: sum(projectAllocs.filter((a) => a.user_id === uid)),
            }));
            const noTask = sum(projectAllocs.filter((a) => a.task_id === null));
            return (
              <article key={project.id} className={`${card} ${project.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {project.name}
                      {!project.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">archivado</span>}
                    </h2>
                    {project.description && <p className="text-sm text-slate-500">{project.description}</p>}
                  </div>
                  <span className="whitespace-nowrap text-lg font-bold tabular-nums text-teal-700">{fmt(sum(projectAllocs))}</span>
                </div>

                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {projectTasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between gap-2 py-2">
                      <span className={task.done ? "text-slate-400 line-through" : "text-slate-700"}>{task.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums text-slate-600">{fmt(sum(projectAllocs.filter((a) => a.task_id === task.id)))}</span>
                        {isAdmin && (
                          <ActionForm action={setTaskDone} showOk={false}>
                            <input type="hidden" name="task_id" value={task.id} />
                            <input type="hidden" name="done" value={String(!task.done)} />
                            <button className="rounded-md px-2 py-0.5 text-xs text-teal-700 hover:bg-teal-50">{task.done ? "Reabrir" : "✓ Hecha"}</button>
                          </ActionForm>
                        )}
                      </span>
                    </li>
                  ))}
                  {noTask > 0 && (
                    <li className="flex justify-between py-2 text-slate-500">
                      <span>Sin tarea</span>
                      <span className="tabular-nums">{fmt(noTask)}</span>
                    </li>
                  )}
                </ul>

                {isAdmin && byEmployee.length > 0 && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Por empleado</p>
                    {byEmployee.map(({ uid, minutes }) => (
                      <p key={uid} className="flex justify-between">
                        <span>{name.get(uid) ?? `Usuario ${uid}`}</span>
                        <span className="tabular-nums">{fmt(minutes)}</span>
                      </p>
                    ))}
                  </div>
                )}

                {isAdmin && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <ActionForm action={addTask} showOk={false} className="flex flex-1 gap-2">
                      <input type="hidden" name="project_id" value={project.id} />
                      <input name="name" required maxLength={200} placeholder="Nueva tarea" aria-label="Nueva tarea" className={`${input} min-w-0 flex-1 py-1.5!`} />
                      <button className={`${btnSecondary} ${btnSmall}`}>Añadir</button>
                    </ActionForm>
                    <ActionForm action={setProjectActive} showOk={false}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="active" value={String(!project.active)} />
                      <button className={`${btnSecondary} ${btnSmall}`}>{project.active ? "Archivar" : "Reactivar"}</button>
                    </ActionForm>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </EmployeeShell>
  );
}
