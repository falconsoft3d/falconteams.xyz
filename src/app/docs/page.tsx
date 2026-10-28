import { Suspense } from "react";
import Link from "next/link";
import { Loading } from "@/components/loading";
import { PublicHeader } from "@/components/public-header";
import { DOCS, type DocBlock } from "@/lib/docs-content";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Documentación · FalconTeams" };

export default function DocsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Docs />
    </Suspense>
  );
}

/** Resalta las rutas (/login, /acme/login…) que aparecen en el texto. */
function Rich({ text }: { text: string }) {
  // Solo rutas que empiezan tras un espacio, paréntesis o comillas (no «ES/EN» ni «activar/desactivar»).
  const parts = text.split(/((?<=^|[\s(«"“])\/[\p{L}\p{N}<>_./-]*[\p{L}\p{N}>])/giu);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? <code key={i} className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em] text-slate-800">{part}</code> : part,
      )}
    </>
  );
}

function Block({ block }: { block: DocBlock }) {
  if ("h" in block) return <h3 className="mt-5 font-semibold text-slate-900">{block.h}</h3>;
  if ("p" in block) return <p className="mt-3 leading-relaxed text-slate-700"><Rich text={block.p} /></p>;
  if ("note" in block) {
    return <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">💡 <Rich text={block.note} /></p>;
  }
  if ("steps" in block) {
    return (
      <ol className="mt-3 space-y-2">
        {block.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-slate-700">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">{i + 1}</span>
            <span><Rich text={step} /></span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-700 marker:text-teal-600">
      {block.list.map((item, i) => <li key={i}><Rich text={item} /></li>)}
    </ul>
  );
}

async function Docs() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const d = DOCS[locale];
  const badge = { admin: "bg-violet-50 text-violet-700", employee: "bg-sky-50 text-sky-700", all: "bg-slate-100 text-slate-600" };

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader locale={locale} user={user} />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-0.5 text-sm" aria-label={d.toc}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{d.toc}</p>
            <a href="#primeros-pasos" className="block rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">{d.quickTitle}</a>
            {d.sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">{s.title}</a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{d.title}</h1>
          <p className="mt-3 max-w-3xl text-lg text-slate-600">{d.lead}</p>

          <details className="mt-6 rounded-xl border border-slate-200 bg-white p-4 lg:hidden">
            <summary className="cursor-pointer font-medium text-slate-700">{d.toc}</summary>
            <nav className="mt-2 grid gap-1 text-sm">
              {d.sections.map((s) => <a key={s.id} href={`#${s.id}`} className="text-teal-700 hover:underline">{s.title}</a>)}
            </nav>
          </details>

          <section id="primeros-pasos" className="mt-10 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900">{d.quickTitle}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {d.quick.map((q) => (
                <div key={q.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-900">{q.title}</h3>
                  <Block block={{ steps: q.steps }} />
                </div>
              ))}
            </div>
          </section>

          {d.sections.map((s) => (
            <section key={s.id} id={s.id} className="mt-12 scroll-mt-24 border-t border-slate-200 pt-8">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">{s.title}</h2>
                {s.audience && <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge[s.audience]}`}>{d.audience[s.audience]}</span>}
              </div>
              {s.blocks.map((b, i) => <Block key={i} block={b} />)}
              {s.id === "extension" && (
                <Link href="/#extension" className="mt-3 inline-block font-medium text-teal-700 hover:underline">{DICTIONARIES[locale].landing.extTitle} →</Link>
              )}
            </section>
          ))}
        </main>
      </div>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">{DICTIONARIES[locale].landing.footer}</footer>
    </div>
  );
}
