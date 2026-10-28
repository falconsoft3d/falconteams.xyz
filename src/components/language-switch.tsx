"use client";

import { useEffect, useTransition } from "react";
import { setLocale } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";

/** Selector ES / EN; guarda la elección en una cookie y recarga la vista. */
export function LanguageSwitch({ locale }: { locale: Locale }) {
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-semibold" aria-busy={pending}>
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={l === locale}
          onClick={() => startTransition(() => setLocale(l))}
          className={`rounded-md px-2 py-1 uppercase ${l === locale ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
