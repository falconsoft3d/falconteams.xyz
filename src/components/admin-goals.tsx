import { ActionForm } from "./action-form";
import { dueLabel, GoalEvidence } from "./goal-evidence";
import { btnDanger, btnPrimary, btnSecondary, btnSmall, card, input, label } from "./ui";
import { createGoal, deleteGoal, reopenGoal } from "@/lib/actions";
import { listGoals, type Profile } from "@/lib/data";
import { formatDate } from "@/lib/time";

/** Objetivos de un empleado en su ficha: asignar, revisar evidencias, reabrir o borrar. */
export async function AdminGoals({ profile, today }: { profile: Profile; today: string }) {
  const goals = await listGoals(profile.user_id);
  const doneCount = goals.filter((g) => g.status === "done").length;

  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Objetivos</h2>
        <span className="text-sm text-slate-500">{doneCount} de {goals.length} cumplidos</span>
      </div>

      <ActionForm action={createGoal} className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[2fr_1fr]">
        <input type="hidden" name="profile_id" value={profile.id} />
        <div>
          <label htmlFor="goal-title" className={label}>Nuevo objetivo</label>
          <input id="goal-title" name="title" required maxLength={200} placeholder="Ej.: Certificación funcional de Odoo" className={input} />
        </div>
        <div>
          <label htmlFor="goal-due" className={label}>Fecha límite (opcional)</label>
          <input id="goal-due" name="due_date" type="date" className={input} />
        </div>
        <div className="sm:col-span-2">
          <textarea name="description" rows={2} maxLength={2000} placeholder="Descripción (opcional)" aria-label="Descripción" className={input} />
        </div>
        <div className="sm:col-span-2">
          <button className={`${btnPrimary} ${btnSmall}`}>Asignar objetivo</button>
        </div>
      </ActionForm>

      {goals.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100">
          {goals.map((goal) => {
            const due = dueLabel(goal, today);
            return (
              <li key={goal.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {goal.status === "done" ? "✓ " : ""}
                    {goal.title}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${goal.status === "done" ? "bg-teal-50 text-teal-700" : due?.overdue ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>
                      {goal.status === "done" ? `cumplido el ${formatDate(goal.completed_at!)}` : due?.overdue ? "vencido" : "pendiente"}
                    </span>
                  </p>
                  {goal.description && <p className="text-sm text-slate-500">{goal.description}</p>}
                  {due && <p className="text-xs text-slate-500">Fecha límite: {due.text}</p>}
                  {goal.status === "done" && <div className="mt-1"><GoalEvidence goal={goal} /></div>}
                </div>
                <div className="flex gap-2">
                  {goal.status === "done" && (
                    <ActionForm action={reopenGoal} showOk={false}>
                      <input type="hidden" name="goal_id" value={goal.id} />
                      <button className={`${btnSecondary} ${btnSmall}`}>Reabrir</button>
                    </ActionForm>
                  )}
                  <ActionForm action={deleteGoal} showOk={false}>
                    <input type="hidden" name="goal_id" value={goal.id} />
                    <button className={`${btnDanger} ${btnSmall}`}>Eliminar</button>
                  </ActionForm>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
