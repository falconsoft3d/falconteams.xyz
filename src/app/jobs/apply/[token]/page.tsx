import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { AnswersForm, TrackingLink } from "@/components/job-forms";
import { Loading } from "@/components/loading";
import { PublicHeader } from "@/components/public-header";
import { getCompanyById } from "@/lib/data";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getApplicationByToken, getOffer, type JobApplication } from "@/lib/recruitment";
import { getCurrentUser } from "@/lib/session";

/** Estado visible para el candidato según el avance y la etapa que marca la empresa. */
function publicStatus(app: JobApplication) {
  if (app.status === "questions") return { key: "status_questions", tone: "bg-amber-50 text-amber-900 border-amber-200" } as const;
  switch (app.stage) {
    case "hired":
      return { key: "status_hired", tone: "bg-teal-600 text-white border-teal-600", text: "status_hired_text" } as const;
    case "rejected":
      return { key: "status_rejected", tone: "bg-slate-100 text-slate-700 border-slate-200", text: "status_rejected_text" } as const;
    case "interview":
      return { key: "status_interview", tone: "bg-violet-50 text-violet-900 border-violet-200" } as const;
    case "shortlisted":
      return { key: "status_shortlisted", tone: "bg-sky-50 text-sky-900 border-sky-200" } as const;
    default:
      return { key: "status_review", tone: "bg-sky-50 text-sky-900 border-sky-200" } as const;
  }
}

export default function ApplyPage(props: PageProps<"/jobs/apply/[token]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Apply {...props} />
    </Suspense>
  );
}

async function Apply({ params }: PageProps<"/jobs/apply/[token]">) {
  const { token } = await params;
  const [locale, user, app, h] = await Promise.all([getLocale(), getCurrentUser(), getApplicationByToken(token), headers()]);
  if (!app) notFound();
  const [offer, company] = await Promise.all([getOffer(app.offer_id), getCompanyById(app.company_id)]);
  if (!offer || !company) notFound();
  const t = DICTIONARIES[locale].jobs;
  const status = publicStatus(app);
  const trackingUrl = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/jobs/apply/${app.token}`;

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader locale={locale} user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="text-sm font-semibold text-teal-700">{company.name}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{offer.title}</h1>

        <section className={`mt-6 rounded-2xl border p-5 ${status.tone}`}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{t.statusLabel}</p>
          <p className="mt-1 text-xl font-bold">{t[status.key]}</p>
          {"text" in status && status.text && <p className="mt-1">{t[status.text]}</p>}
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="font-semibold text-slate-900">{t.trackTitle}</h2>
          <p className="mb-3 mt-1 text-sm text-slate-600">{t.trackText}</p>
          <TrackingLink url={trackingUrl} labels={t} />
        </section>
        {app.status === "questions" ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t.questionsTitle}</h2>
            <p className="mb-6 mt-1 text-sm text-slate-500">{t.questionsLead}</p>
            <AnswersForm token={app.token} questions={(app.questions ?? []).map((q) => q.q)} labels={t} />
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-6">
            <h2 className="text-xl font-semibold text-teal-900">✓ {t.thanksTitle}</h2>
            <p className="mt-2 text-teal-900">{t.thanksText.replace("{offer}", offer.title).replace("{company}", company.name)}</p>
            <Link href="/jobs" className="mt-4 inline-block text-sm font-medium text-teal-700 hover:underline">{t.back}</Link>
          </section>
        )}
      </main>
    </div>
  );
}
