import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { EmployeeShell } from "@/components/employee-shell";
import { SizedFileInput } from "@/components/file-inputs";
import { dueLabel, GoalEvidence } from "@/components/goal-evidence";
import { Loading } from "@/components/loading";
import { btnPrimary, btnSmall, card, input, label, pageTitle } from "@/components/ui";
import { completeGoal } from "@/lib/actions";
import { listGoals } from "@/lib/data";
import { requestNow } from "@/lib/now";
import { requireCompanyEmployee } from "@/lib/session";
import { dayKey, formatDate } from "@/lib/time";

export default function GoalsPage(props: PageProps<"/[company]/goals">) {
  return (
    <Suspense fallback={<Loading />}>
      <Goals {...props} />
    </Suspense>
  );
}

async function Goals({ params }: PageProps<"/[company]/goals">) {
  const { company: slug } = await params;
  const { user, company } = await requireCompanyEmployee(slug);
  const now = await requestNow();
  const today = dayKey(now);
  const goals = await listGoals(user.userId);
  const pending = goals.filter((g) => g.status === "pending");
  const done = goals.filter((g) => g.status === "done");

  return (
    <EmployeeShell user={user} company={company}>
      <div>
        <h1 className={pageTitle}>Mis objetivos</h1>
        <p className="mt-1 text-slate-500">
          {pending.length} pendientes · {done.length} cumplidos. Para marcar uno como cumplido adjunta un documento o un enlace de YouTube.
        </p>
      </div>

      {goals.length === 0 && <p className={`${card} text-sm text-slate-500`}>Todavía no tienes objetivos asignados.</p>}

      {pending.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold text-slate-900">Pendientes</h2>
          {pending.map((goal) => {
            const due = dueLabel(goal, today);
            return (
              <article key={goal.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">{goal.title}</h3>
                  {due && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${due.overdue ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                      {due.overdue ? "Vencido · " : "Fecha límite · "}
                      {due.text}
                    </span>
                  )}
                </div>
                {goal.description && <p className="mt-1 whitespace-pre-line text-slate-600">{goal.description}</p>}
                <ActionForm action={completeGoal} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <input type="hidden" name="goal_id" value={goal.id} />
                  <div>
                    <label htmlFor={`file-${goal.id}`} className={label}>Documento</label>
                    <SizedFileInput
                      id={`file-${goal.id}`}
                      name="evidence_file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.png,.jpg,.jpeg"
                      maxBytes={2 * 1024 * 1024}
                    />
                    <p className="mt-1 text-xs text-slate-500">PDF, Office, LibreOffice, texto o imagen · máx. 2 MB</p>
                  </div>
                  <div>
                    <label htmlFor={`url-${goal.id}`} className={label}>o enlace de YouTube</label>
                    <input id={`url-${goal.id}`} name="evidence_url" type="url" placeholder="https://youtu.be/…" className={input} />
                  </div>
                  <div className="sm:col-span-2">
                    <button className={`${btnPrimary} ${btnSmall}`}>✓ Marcar como cumplido</button>
                  </div>
                </ActionForm>
              </article>
            );
          })}
        </section>
      )}

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">Cumplidos</h2>
          {done.map((goal) => (
            <article key={goal.id} className={`${card} border-teal-100 bg-teal-50/40`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">✓ {goal.title}</h3>
                <span className="text-xs text-teal-700">Cumplido el {formatDate(goal.completed_at!)}</span>
              </div>
              {goal.description && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{goal.description}</p>}
              <div className="mt-2">
                <GoalEvidence goal={goal} />
              </div>
            </article>
          ))}
        </section>
      )}
    </EmployeeShell>
  );
}
