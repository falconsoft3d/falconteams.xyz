import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { Loading } from "@/components/loading";
import { OfferMeta } from "@/components/offer-meta";
import { PlanetsHero } from "@/components/planets-hero";
import { PublicHeader } from "@/components/public-header";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { DOCS } from "@/lib/docs-content";
import { openOffersByCompany } from "@/lib/public-jobs";
import { offerImageUrl } from "@/lib/recruitment";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getCurrentUser, homeFor } from "@/lib/session";

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <Landing />
    </Suspense>
  );
}

async function Landing() {
  const [locale, user, h, jobGroups] = await Promise.all([getLocale(), getCurrentUser(), headers(), openOffersByCompany()]);
  const t = DICTIONARIES[locale].landing;
  const docs = DOCS[locale];
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "falconteams.xyz"}`;
  const example = `${origin}/${locale === "en" ? "your-company" : "tu-empresa"}`;
  const cta = user ? (
    <Link href={homeFor(user)} className={btnPrimary}>{t.goDashboard} →</Link>
  ) : (
    <Link href="/login" className={btnPrimary}>{t.login}</Link>
  );

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader locale={locale} user={user} />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-teal-50">
          <PlanetsHero locale={locale} />
          {/* El bloque de texto deja pasar el ratón a los planetas; enlaces y botones siguen activos. */}
          <div className="pointer-events-none relative z-10 mx-auto max-w-6xl px-4 py-24 text-center [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{t.title}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">{t.lead}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {cta}
              <Link href="/docs" className={btnSecondary}>{t.docs}</Link>
              <a href="#extension" className={btnSecondary}>{t.extTitle}</a>
            </div>
            {user && <p className="mt-4 text-sm text-slate-500">{t.signedInAs.replace("{name}", user.name)}</p>}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold text-slate-900">{t.featuresTitle}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.map(([icon, title, text]) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-2xl">{icon}</p>
                <h3 className="mt-2 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        {jobGroups.length > 0 && (
          <section id="empleo" className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-16">
              <h2 className="text-center text-2xl font-bold text-slate-900">{t.jobsTitle}</h2>
              <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">{t.jobsLead}</p>
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {jobGroups.map(({ company, offers }) => (
                  <div key={company.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-teal-700 text-xs font-bold text-white">{company.name.slice(0, 2).toUpperCase()}</span>
                      {company.name}
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {offers.slice(0, 4).map((o) => (
                        <li key={o.id}>
                          <Link href={`/jobs/${o.id}`} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-teal-300">
                            {offerImageUrl(o) && (
                              // eslint-disable-next-line @next/next/no-img-element -- imagen servida por /api/jobs
                              <img src={offerImageUrl(o)!} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">{o.title}</p>
                              <div className="mt-1.5"><OfferMeta offer={o} /></div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-center">
                <Link href="/jobs" className={btnPrimary}>{t.jobsAll}</Link>
              </p>
            </div>
          </section>
        )}

        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-bold text-slate-900">{docs.quickTitle}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {docs.quick.map((q) => (
                <div key={q.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-900">{q.title}</h3>
                  <ol className="mt-3 space-y-2">
                    {q.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-700">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">{i + 1}</span>
                        <span className="pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center">
              <Link href="/docs" className={btnPrimary}>{t.docsCta}</Link>
            </p>
          </div>
        </section>

        <section id="extension" className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <span className="flex size-14 items-center justify-center rounded-2xl bg-teal-700 text-xl font-bold text-white">FT</span>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">{t.extTitle}</h2>
              <p className="mt-2 text-slate-600">{t.extLead}</p>
              <a href="/falconteams-extension.zip" download className={`${btnPrimary} mt-6`}>{t.extDownload}</a>
              <p className="mt-2 text-xs text-slate-500">Google Chrome · Microsoft Edge · Brave</p>
            </div>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t.whatTitle}</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {t.what.map(([icon, text]) => (
                    <li key={text} className="flex gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <span aria-hidden>{icon}</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t.installTitle}</h3>
                <ol className="mt-3 space-y-2">
                  {t.install.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">{i + 1}</span>
                      <span className="pt-0.5">
                        {step.includes("chrome://extensions") ? (
                          <>
                            {step.replace("chrome://extensions", "")}
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">chrome://extensions</code>
                          </>
                        ) : (
                          step
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t.useTitle}</h3>
                <ol className="mt-3 space-y-2">
                  {t.use.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">{i + 1}</span>
                      <span className="pt-0.5">
                        {step.includes("{example}") ? (
                          <>
                            {step.split("{example}")[0]}
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">{example}</code>
                            {step.split("{example}")[1]}
                          </>
                        ) : (
                          step
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>
        <section id="instalacion" className="border-t border-slate-200 bg-white print:hidden">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold text-slate-900">{t.selfTitle}</h2>
                <p className="mt-2 text-slate-600">{t.selfLead}</p>
              </div>
              <a
                href="https://github.com/falconsoft3d/falconteams.xyz"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
                  <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
                </svg>
                {t.repoCta}
              </a>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
              <div className="space-y-8">
                <div>
                  <h3 className="font-semibold text-slate-900">{t.fdbTitle}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {t.fdb.map((item) => (
                      <li key={item} className="flex gap-2"><span className="text-teal-600">●</span><span>{item}</span></li>
                    ))}
                  </ul>
                  <a href="https://falcondatabase.com" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-teal-700 hover:underline">falcondatabase.com ↗</a>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{t.envTitle}</h3>
                  <dl className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50 text-sm">
                    {t.env.map(([name, text]) => (
                      <div key={name} className="grid grid-cols-[minmax(0,11rem)_1fr] gap-3 px-3 py-2">
                        <dt className="truncate font-mono text-xs text-teal-700">{name}</dt>
                        <dd className="text-slate-600">{text}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{t.installSteps}</h3>
                <ol className="mt-3 space-y-4">
                  {t.steps.map(([title, body], i) => (
                    <li key={title} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{title}</p>
                        {/^(git|cp|npm|ADMIN)/.test(body) ? (
                          <pre className="mt-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-3 text-xs leading-relaxed text-slate-800"><code>{body}</code></pre>
                        ) : (
                          <p className="mt-0.5 text-sm text-slate-600">{body}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        {t.footer} · <Link href="/docs" className="hover:text-teal-700">{t.docs}</Link> · <Link href="/cookies" className="hover:text-teal-700">Cookies</Link> ·{" "}
        <Link href="/blog" className="hover:text-teal-700">{t.blog}</Link> ·{" "}
        <Link href="/contact" className="hover:text-teal-700">{t.contact}</Link> ·{" "}
        <a href="https://github.com/falconsoft3d/falconteams.xyz" target="_blank" rel="noreferrer" className="hover:text-teal-700">GitHub</a>
      </footer>
    </div>
  );
}
