import { Suspense } from "react";
import { ResetConsent } from "@/components/cookie-consent";
import { Loading } from "@/components/loading";
import { PublicHeader } from "@/components/public-header";
import { getLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Cookies · FalconTeams" };

const CONTENT = {
  es: {
    title: "Política de cookies",
    lead: "Qué guarda FalconTeams en tu navegador y para qué.",
    cols: ["Nombre", "Tipo", "Para qué", "Duración"],
    rows: [
      ["ft_session", "Cookie esencial", "Mantener tu sesión iniciada (httpOnly: no la puede leer JavaScript)", "7 días"],
      ["ft_lang", "Cookie esencial", "Recordar el idioma que eliges", "1 año"],
      ["ft-theme, ft-sidebar", "Almacenamiento local", "Recordar el tema (claro/oscuro) y el menú lateral contraído", "Hasta que lo borres"],
      ["ft-consent", "Almacenamiento local", "Recordar tu elección sobre este aviso", "Hasta que lo borres"],
    ],
    analyticsTitle: "Analítica (opcional)",
    analytics: "Si aceptas, cargamos la analítica de falcondatabase para contar visitas. No usa cookies ni guarda direcciones IP. Si eliges «Solo esenciales», no se carga.",
    change: "Cambiar mi elección",
  },
  en: {
    title: "Cookie policy",
    lead: "What FalconTeams stores in your browser and why.",
    cols: ["Name", "Type", "Purpose", "Duration"],
    rows: [
      ["ft_session", "Essential cookie", "Keep you signed in (httpOnly: JavaScript cannot read it)", "7 days"],
      ["ft_lang", "Essential cookie", "Remember the language you choose", "1 year"],
      ["ft-theme, ft-sidebar", "Local storage", "Remember the theme (light/dark) and the collapsed side menu", "Until you clear it"],
      ["ft-consent", "Local storage", "Remember your choice on this notice", "Until you clear it"],
    ],
    analyticsTitle: "Analytics (optional)",
    analytics: "If you accept, we load falcondatabase analytics to count visits. It uses no cookies and stores no IP addresses. If you choose “Essential only”, it is not loaded.",
    change: "Change my choice",
  },
};

export default function CookiesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Cookies />
    </Suspense>
  );
}

async function Cookies() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const t = CONTENT[locale];
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader locale={locale} user={user} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-2 text-slate-600">{t.lead}</p>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>{t.cols.map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {t.rows.map(([name, type, purpose, duration]) => (
                <tr key={name}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">{name}</td>
                  <td className="px-4 py-3 text-slate-600">{type}</td>
                  <td className="px-4 py-3 text-slate-700">{purpose}</td>
                  <td className="px-4 py-3 text-slate-600">{duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2 className="mt-10 text-xl font-semibold text-slate-900">{t.analyticsTitle}</h2>
        <p className="mt-2 text-slate-700">{t.analytics}</p>
        <div className="mt-6"><ResetConsent label={t.change} /></div>
      </main>
    </div>
  );
}
