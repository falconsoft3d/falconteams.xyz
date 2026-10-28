import { Suspense } from "react";
import { ContactForm } from "@/components/contact-form";
import { Loading } from "@/components/loading";
import { PublicHeader } from "@/components/public-header";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Contacto · FalconTeams" };

const OWNER = { name: "Marlon Falcón Hernández", email: "mfalconsoft@gmail.com" };

export default function ContactPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Contact />
    </Suspense>
  );
}

async function Contact() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const t = DICTIONARIES[locale].contact;
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader locale={locale} user={user} />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-4 py-14 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.title}</h1>
          <p className="mt-3 text-lg text-slate-600">{t.lead}</p>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-full bg-teal-700 text-lg font-bold text-white">MF</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.who}</p>
                <p className="text-lg font-semibold text-slate-900">{OWNER.name}</p>
              </div>
            </div>
            <a href={`mailto:${OWNER.email}`} className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-teal-700 hover:bg-teal-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>
                <span className="block text-xs text-slate-500">{t.emailUs}</span>
                <span className="font-medium">{OWNER.email}</span>
              </span>
            </a>
          </div>
        </div>
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{t.formTitle}</h2>
          <ContactForm labels={t} />
        </section>
      </main>
    </div>
  );
}
