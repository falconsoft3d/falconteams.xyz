import { Suspense } from "react";
import Link from "next/link";
import { Loading } from "@/components/loading";
import { OfferMeta } from "@/components/offer-meta";
import { PublicHeader } from "@/components/public-header";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { openOffersByCompany } from "@/lib/public-jobs";
import { offerImageUrl } from "@/lib/recruitment";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Ofertas de empleo · FalconTeams" };

export default function JobsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Jobs />
    </Suspense>
  );
}

async function Jobs() {
  const [locale, user, groups] = await Promise.all([getLocale(), getCurrentUser(), openOffersByCompany()]);
  const t = DICTIONARIES[locale].jobs;
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader locale={locale} user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-2 text-lg text-slate-600">{t.lead}</p>
        {groups.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">{t.none}</p>
        ) : (
          <div className="mt-10 space-y-10">
            {groups.map(({ company, offers }) => (
              <section key={company.id} id={company.slug}>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-teal-700 font-bold text-white">{company.name.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{company.name}</h2>
                    <p className="text-sm text-slate-500">{offers.length === 1 ? t.opening : t.openings.replace("{n}", String(offers.length))}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {offers.map((o) => (
                    <Link key={o.id} href={`/jobs/${o.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md">
                      {offerImageUrl(o) && (
                        // eslint-disable-next-line @next/next/no-img-element -- imagen servida por /api/jobs
                        <img src={offerImageUrl(o)!} alt="" className="-mx-5 -mt-5 mb-4 aspect-[2/1] w-[calc(100%+2.5rem)] max-w-none object-cover" />
                      )}
                      <h3 className="font-semibold text-slate-900 group-hover:text-teal-700">{o.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{o.description}</p>
                      <div className="mt-3"><OfferMeta offer={o} /></div>
                      <p className="mt-3 text-sm font-medium text-teal-700">{t.see}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">{DICTIONARIES[locale].landing.footer}</footer>
    </div>
  );
}
