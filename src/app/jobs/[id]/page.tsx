import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyForm } from "@/components/job-forms";
import { Loading } from "@/components/loading";
import { OfferMeta } from "@/components/offer-meta";
import { PublicHeader } from "@/components/public-header";
import { getCompanyById } from "@/lib/data";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getOffer, offerImageUrl } from "@/lib/recruitment";
import { getCurrentUser } from "@/lib/session";

export default function OfferPage(props: PageProps<"/jobs/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Offer {...props} />
    </Suspense>
  );
}

async function Offer({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const offer = Number(id) > 0 ? await getOffer(Number(id)) : null;
  const company = offer ? await getCompanyById(offer.company_id) : null;
  if (!offer || !company?.active) notFound();
  const t = DICTIONARIES[locale].jobs;

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader locale={locale} user={user} />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article>
          <Link href="/jobs" className="text-sm text-slate-500 hover:text-teal-700">{t.back}</Link>
          {offerImageUrl(offer) && (
            // eslint-disable-next-line @next/next/no-img-element -- imagen servida por /api/jobs
            <img src={offerImageUrl(offer)!} alt={offer.title} className="mt-4 aspect-[2/1] w-full rounded-2xl object-cover ring-1 ring-slate-200" />
          )}
          <p className="mt-4 text-sm font-semibold text-teal-700">{company.name}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{offer.title}</h1>
          <div className="mt-3"><OfferMeta offer={offer} /></div>
          <div className="mt-6 whitespace-pre-line leading-relaxed text-slate-700">{offer.description}</div>
        </article>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-20">
          {offer.open ? (
            <>
              <h2 className="text-lg font-semibold text-slate-900">{t.applyTitle}</h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">{t.applyLead}</p>
              <ApplyForm offerId={offer.id} labels={t} />
              <p className="mt-3 text-xs text-slate-500">{t.privacy.replace("{company}", company.name)}</p>
            </>
          ) : (
            <p className="text-slate-600">{t.closed}</p>
          )}
        </aside>
      </main>
    </div>
  );
}
