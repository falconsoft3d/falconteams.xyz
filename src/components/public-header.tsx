import Link from "next/link";
import { LanguageSwitch } from "./language-switch";
import { ThemeToggle } from "./theme";
import { btnPrimary } from "./ui";
import { DICTIONARIES, type Locale } from "@/lib/i18n";
import { homeFor, type CurrentUser } from "@/lib/session";

/** Cabecera de las páginas públicas (landing y documentación). */
export function PublicHeader({ locale, user }: { locale: Locale; user: CurrentUser | null }) {
  const t = DICTIONARIES[locale].landing;
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">FT</span>
          <span className="font-semibold text-slate-900">FalconTeams</span>
        </Link>
        <nav className="ml-4 hidden gap-1 text-sm sm:flex">
          <Link href="/jobs" className="rounded-lg px-3 py-1.5 font-medium text-teal-700 hover:bg-teal-50">{t.apply}</Link>
          <Link href="/docs" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">{t.docs}</Link>
          <Link href="/blog" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">{t.blog}</Link>
          <Link href="/#extension" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">{t.extTitle}</Link>
          <Link href="/#instalacion" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">GitHub</Link>
          <Link href="/contact" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">{t.contact}</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitch locale={locale} />
          <ThemeToggle />
          {user ? (
            <Link href={homeFor(user)} className={btnPrimary}>{t.goDashboard} →</Link>
          ) : (
            <Link href="/login" className={btnPrimary}>{t.login}</Link>
          )}
        </div>
      </div>
    </header>
  );
}
