import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { ScoreBadge } from "@/components/score-badge";
import { btnPrimary, btnSecondary, btnSmall, card, input, pageTitle } from "@/components/ui";
import { reevaluateApplication, setApplicationStage } from "@/lib/actions";
import { getApplication, getOffer, STAGES } from "@/lib/recruitment";
import { requireCompanyMember } from "@/lib/session";
import { formatDate } from "@/lib/time";

export default function ApplicantPage(props: PageProps<"/[company]/recruitment/[offerId]/[appId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Applicant {...props} />
    </Suspense>
  );
}

async function Applicant({ params }: PageProps<"/[company]/recruitment/[offerId]/[appId]">) {
  const { company: slug, offerId, appId } = await params;
  const { user, company, isAdmin } = await requireCompanyMember(slug);
  if (!isAdmin) redirect(`/${slug}`);
  const [offer, app] = await Promise.all([getOffer(Number(offerId) || 0), getApplication(Number(appId) || 0)]);
  if (!offer || !app || offer.company_id !== company.id || app.offer_id !== offer.id) notFound();
  const ev = app.evaluation;

  return (
    <EmployeeShell user={user} company={company}>
      <Link href={`/${slug}/recruitment/${offer.id}`} className="text-sm text-slate-500 hover:text-teal-700">← {offer.title}</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={pageTitle}>{app.name}</h1>
          <p className="mt-1 text-slate-500">
            <a href={`mailto:${app.email}`} className="hover:text-teal-700">{app.email}</a>
            {app.phone && ` · ${app.phone}`}
            {(app.city || app.country) && ` · 📍 ${[app.city, app.country].filter(Boolean).join(", ")}`}
            {app.link && (<> · <a href={app.link} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">perfil / CV ↗</a></>)}
          </p>
          <p className="text-sm text-slate-400">Postulado el {formatDate(app.created_at)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Nota IA</p>
          <ScoreBadge score={app.score} size="text-2xl" />
        </div>
      </div>

      <section className={`${card} flex flex-wrap items-center gap-4`}>
        <ActionForm action={setApplicationStage} showOk={false} className="flex items-center gap-2">
          <input type="hidden" name="application_id" value={app.id} />
          <label htmlFor="stage" className="text-sm text-slate-600">Etapa</label>
          <select id="stage" name="stage" defaultValue={app.stage} className={`${input} w-auto! py-1.5!`}>
            {Object.entries(STAGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className={`${btnSecondary} ${btnSmall}`}>Guardar</button>
        </ActionForm>
        {app.status !== "questions" && (
          <ActionForm action={reevaluateApplication} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="application_id" value={app.id} />
            <button className={`${btnPrimary} ${btnSmall}`}>{app.score === null ? "Evaluar con IA" : "Volver a evaluar"}</button>
          </ActionForm>
        )}
        {app.status === "questions" && <p className="text-sm text-amber-700">El candidato todavía no ha enviado sus respuestas.</p>}
      </section>

      {ev && (
        <section className={`${card} grid gap-4 md:grid-cols-3`}>
          <div className="md:col-span-3">
            <h2 className="font-semibold text-slate-900">Valoración de la IA</h2>
            <p className="mt-1 whitespace-pre-line text-slate-700">{ev.summary}</p>
          </div>
          {ev.strengths.length > 0 && (
            <div className="md:col-span-1">
              <p className="text-sm font-semibold text-teal-700">Fortalezas</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{ev.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {ev.concerns.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-rose-700">A revisar</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{ev.concerns.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      {app.about && (
        <section className={card}>
          <h2 className="font-semibold text-slate-900">Presentación</h2>
          <p className="mt-1 whitespace-pre-line text-slate-700">{app.about}</p>
        </section>
      )}

      <section className={card}>
        <h2 className="mb-3 font-semibold text-slate-900">Cuestionario</h2>
        <ol className="space-y-4">
          {(app.questions ?? []).map((q, i) => {
            const pq = ev?.perQuestion[i];
            return (
              <li key={i} className="border-b border-slate-100 pb-4 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-900">
                    {i + 1}. {q.q}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-normal ${q.source === "ai" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
                      {q.source === "ai" ? "IA" : "empresa"}
                    </span>
                  </p>
                  {pq && <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-700">{pq.score}/10</span>}
                </div>
                <p className="mt-1 whitespace-pre-line text-slate-700">{app.answers?.[i] || <span className="text-slate-400">(sin respuesta)</span>}</p>
                {pq?.comment && <p className="mt-1 border-l-2 border-violet-200 pl-2 text-sm text-violet-800">{pq.comment}</p>}
              </li>
            );
          })}
        </ol>
      </section>
    </EmployeeShell>
  );
}
