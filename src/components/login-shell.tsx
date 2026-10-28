import type { ReactNode } from "react";
import Link from "next/link";
import { LanguageSwitch } from "./language-switch";
import { ThemeToggle } from "./theme";
import { getLocale } from "@/lib/locale";

/** Marco centrado de las pantallas de login. */
export async function LoginShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const locale = await getLocale();
  return (
    <main className="relative flex flex-1 items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4 py-12">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitch locale={locale} />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-teal-700 text-lg font-bold text-white">FT</Link>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
