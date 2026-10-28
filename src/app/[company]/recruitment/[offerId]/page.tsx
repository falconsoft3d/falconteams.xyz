import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { OfferForm } from "@/components/offer-form";
import { ScoreBadge } from "@/components/score-badge";
import { card, pageTitle } from "@/components/ui";
import { getOffer, listApplications, STAGES } from "@/lib/recruitment";
import { requireCompanyMember } from "@/lib/session";
import { formatDate } from "@/lib/time";

export default function OfferAdminPage(props: PageProps<"/[company]/recruitment/[offerId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <OfferAdmin {...props} />
    </Suspense>
  );
}

const STATUS = { questions: "respondiendo", submitted: "enviado", evaluated: "evaluado" } as const;

async function OfferAdmin({ params }: PageProps<"/[company]/recruitment/[offerId]">) {
  const { company: slug, offerId } = await params;
  const { user, company, isAdmin } = await requireCompanyMember(slug);
  if (!isAdmin) redirect(`/${slug}`);
  const offer = Number(offerId) > 0 ? await getOffer(Number(offerId)) : null;
  if (!offer || offer.company_id !== company.id) notFound();
  const apps = await listApplications(offer.id);

  return (
    <EmployeeShell user={user} company={company}>
      <Link href={`/${slug}/recruitment`} className="text-sm text-slate-500 hover:text-teal-700">← Reclutamiento</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={pageTitle}>{offer.title}</h1>
          <p className="mt-1 text-slate-500">
            {apps.length} candidatos · {offer.open ? "abierta" : "cerrada"} ·{" "}
            <Link href={`/jobs/${offer.id}`} target="_blank" className="text-teal-700 hover:underline">enlace para compartir ↗</Link>
          </p>
        </div>
      </div>

      <section className={`${card} overflow-x-auto p-0!`}>
        <h2 className="px-5 pt-5 font-semibold text-slate-900">Escalafón</h2>
        {apps.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Aún no hay candidatos. Comparte el enlace público de la oferta.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-5 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Candidato</th>
                <th className="px-3 py-2 font-medium">Nota</th>
                <th className="px-3 py-2 font-medium">Etapa</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-5 py-2 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apps.map((a, i) => (
                <tr key={a.id} className={a.stage === "rejected" ? "opacity-50" : ""}>
                  <td className="px-5 py-3 font-semibold text-slate-400">{a.score !== null ? i + 1 : "—"}</td>
                  <td className="px-3 py-3">
                    <Link href={`/${slug}/recruitment/${offer.id}/${a.id}`} className="font-medium text-slate-900 hover:text-teal-700">{a.name}</Link>
                    <div className="text-slate-500">{a.email}{(a.city || a.country) && ` · ${[a.city, a.country].filter(Boolean).join(", ")}`}</div>
                  </td>
                  <td className="px-3 py-3"><ScoreBadge score={a.score} /></td>
                  <td className="px-3 py-3">{STAGES[a.stage] ?? a.stage}</td>
                  <td className="px-3 py-3 text-slate-500">{STATUS[a.status]}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <details className={card}>
        <summary className="cursor-pointer font-semibold text-slate-900">Editar oferta</summary>
        <div className="mt-4"><OfferForm companyId={company.id} offer={offer} /></div>
      </details>
    </EmployeeShell>
  );
}
