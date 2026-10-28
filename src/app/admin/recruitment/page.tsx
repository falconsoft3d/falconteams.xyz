import { Suspense } from "react";
import Link from "next/link";
import { Loading } from "@/components/loading";
import { btnPrimary, btnSmall, card, pageTitle } from "@/components/ui";
import { listCompanies } from "@/lib/data";
import { applicationStats, listOffers } from "@/lib/recruitment";
import { requireAdmin } from "@/lib/session";

export default function AdminRecruitmentPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className={pageTitle}>Reclutamiento</h1>
        <Link href="/jobs" target="_blank" className="text-sm text-teal-700 hover:underline">Página pública «Postula» ↗</Link>
      </div>
      <Suspense fallback={<Loading />}>
        <Overview />
      </Suspense>
    </div>
  );
}

async function Overview() {
  await requireAdmin();
  const [companies, offers, stats] = await Promise.all([listCompanies(), listOffers(), applicationStats()]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {companies.map((c) => {
        const mine = offers.filter((o) => o.company_id === c.id);
        return (
          <section key={c.id} className={card}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{c.name}</h2>
              <Link href={`/${c.slug}/recruitment`} className={`${btnPrimary} ${btnSmall}`}>Gestionar →</Link>
            </div>
            {mine.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Sin ofertas todavía.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {mine.map((o) => (
                  <li key={o.id} className="flex justify-between gap-2">
                    <Link href={`/${c.slug}/recruitment/${o.id}`} className="truncate text-slate-700 hover:text-teal-700">
                      {o.title} {!o.open && <span className="text-xs text-slate-400">(cerrada)</span>}
                    </Link>
                    <span className="whitespace-nowrap text-slate-500">{stats.get(o.id)?.count ?? 0} candidatos</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
