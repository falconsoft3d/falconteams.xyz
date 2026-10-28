import type { ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "./avatar";
import { ChatDock } from "./chat-dock";
import { SidebarNav, type NavLink } from "./sidebar-nav";
import { SidebarToggle } from "./sidebar-toggle";
import { LanguageSwitch } from "./language-switch";
import { ThemeToggle } from "./theme";
import { logout } from "@/lib/actions";
import type { TKey } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/locale";
import type { CurrentUser } from "@/lib/session";

export type FrameLink = { href: string; label: TKey };

function Brand({ title, home, collapsible = false }: { title: string; home: string; collapsible?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${collapsible ? "collapsed:justify-center" : ""}`} title={home}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">FT</span>
      <span className={`truncate font-semibold text-slate-900 ${collapsible ? "collapsed:hidden" : ""}`}>{title}</span>
    </Link>
  );
}

/**
 * Marco de la app: menú lateral a la izquierda (en móvil, desplegable) y una
 * barra superior solo con el usuario y «Salir».
 */
export async function AppFrame({ title, links, topbar, chatCompany = "", children }: {
  title: string;
  links: FrameLink[];
  /** Empresa del chat flotante ("" = admin fuera de una empresa). */
  chatCompany?: string;
  /** Contenido de la barra superior (normalmente <UserBar />). */
  topbar: ReactNode;
  children: ReactNode;
}) {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  // El icono sale de la clave del menú: "nav.dashboard" → "dashboard".
  const nav: NavLink[] = links.map((l) => ({ href: l.href, label: t(l.label), icon: l.label.split(".")[1] }));
  return (
    <div className="flex min-h-screen flex-1">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white px-3 py-4 transition-[width] duration-200 collapsed:w-[4.5rem] md:flex print:hidden">
        <div className="px-2 collapsed:px-0">
          <Brand title={title} home={t("common.home")} collapsible />
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarNav links={nav} collapsible />
        </div>
        <div className="border-t border-slate-100 pt-3">
          <SidebarToggle label={t("common.collapse")} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 print:hidden">
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-lg px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
              ☰ {t("common.menu")}
            </summary>
            <div className="absolute left-0 top-10 z-20 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-3 px-2"><Brand title={title} home={t("common.home")} /></div>
              <SidebarNav links={nav} />
            </div>
          </details>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitch locale={locale} />
            <ThemeToggle />
            {topbar}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 pb-24 print:max-w-none print:p-0">{children}</main>
      </div>
      <ChatDock company={chatCompany} />
    </div>
  );
}

/** Usuario actual (enlace a su perfil) y botón de salir. */
export async function UserBar({ user, companySlug }: { user: CurrentUser; companySlug?: string }) {
  const t = await getT();
  return (
    <>
      <Link
        href={user.role === "admin" || !companySlug ? "/admin/profile" : `/${companySlug}/profile`}
        title={t("common.myProfile")}
        className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 text-sm text-slate-600 hover:bg-slate-100"
      >
        <Avatar name={user.name} url={user.avatarUrl} />
        <span className="hidden sm:inline">{user.name}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{user.role === "admin" ? t("common.admin") : t("common.employee")}</span>
      </Link>
      <form action={logout}>
        {companySlug && <input type="hidden" name="company" value={companySlug} />}
        <button className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">{t("common.logout")}</button>
      </form>
    </>
  );
}
