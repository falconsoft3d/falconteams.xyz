import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { OfferForm } from "@/components/offer-form";
import { btnDanger, btnPrimary, btnSecondary, btnSmall, card, input, pageTitle } from "@/components/ui";
import { aiReady } from "@/lib/ai";
import { addRecruitQuestion, removeRecruitQuestion, setOfferOpen } from "@/lib/actions";
import { getCompanyAi } from "@/lib/chat";
import { AI_QUESTIONS, applicationStats, listCompanyQuestions, listOffers, MAX_COMPANY_QUESTIONS } from "@/lib/recruitment";
import { requireCompanyMember } from "@/lib/session";

export default function RecruitmentPage(props: PageProps<"/[company]/recruitment">) {
  return (
    <Suspense fallback={<Loading />}>
      <Recruitment {...props} />
    </Suspense>
  );
}

async function Recruitment({ params }: PageProps<"/[company]/recruitment">) {
  const { company: slug } = await params;
  const { user, company, isAdmin } = await requireCompanyMember(slug);
  if (!isAdmin) redirect(`/${slug}`);
  const [offers, questions, stats, ai] = await Promise.all([
    listOffers(company.id),
    listCompanyQuestions(company.id),
    applicationStats(company.id),
    getCompanyAi(company.id),
  ]);

  return (
    <EmployeeShell user={user} company={company}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={pageTitle}>Reclutamiento</h1>
          <p className="mt-1 text-slate-500">Ofertas de {company.name}, candidatos y escalafón evaluado por IA.</p>
        </div>
        <Link href="/jobs" target="_blank" className={`${btnSecondary} ${btnSmall}`}>Ver página pública ↗</Link>
      </div>

      {!aiReady(ai) && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          La IA de la empresa no está activada: los candidatos solo responderán vuestras preguntas y no se evaluarán automáticamente.{" "}
          <Link href="/admin/companies" className="font-medium underline">Actívala en Empresas</Link>.
        </p>
      )}

      <section className={card}>
        <h2 className="font-semibold text-slate-900">Ofertas</h2>
        {offers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Todavía no hay ofertas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {offers.map((o) => {
              const s = stats.get(o.id);
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/${slug}/recruitment/${o.id}`} className="font-medium text-slate-900 hover:text-teal-700">{o.title}</Link>
                    <p className="text-sm text-slate-500">
                      {s?.count ?? 0} candidatos{s?.best != null ? ` · mejor nota ${s.best}` : ""} ·{" "}
                      <span className={o.open ? "text-teal-700" : "text-slate-400"}>{o.open ? "abierta" : "cerrada"}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/jobs/${o.id}`} target="_blank" className="text-sm text-teal-700 hover:underline">Enlace público ↗</Link>
                    <ActionForm action={setOfferOpen} showOk={false}>
                      <input type="hidden" name="offer_id" value={o.id} />
                      <input type="hidden" name="open" value={String(!o.open)} />
                      <button className={`${btnSecondary} ${btnSmall}`}>{o.open ? "Cerrar" : "Reabrir"}</button>
                    </ActionForm>
                    <Link href={`/${slug}/recruitment/${o.id}`} className={`${btnPrimary} ${btnSmall}`}>Escalafón →</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 font-semibold text-slate-900">Nueva oferta</h2>
          <OfferForm companyId={company.id} />
        </section>

        <section className={card}>
          <h2 className="font-semibold text-slate-900">Preguntas de la empresa</h2>
          <p className="mb-3 mt-1 text-sm text-slate-500">
            Se hacen a todos los candidatos de {company.name}. La IA añade otras {AI_QUESTIONS} según cada oferta. Máximo {MAX_COMPANY_QUESTIONS}.
          </p>
          <ol className="space-y-2">
            {questions.map((q, i) => (
              <li key={q.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span><span className="font-semibold text-teal-700">{i + 1}.</span> {q.question}</span>
                <ActionForm action={removeRecruitQuestion} showOk={false}>
                  <input type="hidden" name="question_id" value={q.id} />
                  <button className={`${btnDanger} ${btnSmall}`} aria-label="Eliminar pregunta">✕</button>
                </ActionForm>
              </li>
            ))}
          </ol>
          {questions.length < MAX_COMPANY_QUESTIONS && (
            <ActionForm action={addRecruitQuestion} showOk={false} className="mt-3 flex gap-2">
              <input type="hidden" name="company_id" value={company.id} />
              <input name="question" required maxLength={500} placeholder="¿Por qué quieres trabajar con nosotros?" aria-label="Nueva pregunta" className={`${input} min-w-0 flex-1`} />
              <button className={`${btnSecondary} ${btnSmall}`}>Añadir</button>
            </ActionForm>
          )}
        </section>
      </div>
    </EmployeeShell>
  );
}
