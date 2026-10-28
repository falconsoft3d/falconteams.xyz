"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";

// Aviso de cookies. Las esenciales (sesión, idioma) siempre se usan; la analítica
// de falcondatabase solo se carga si el visitante acepta. La elección se guarda
// en el navegador (localStorage "ft-consent": "all" | "essential").

const KEY = "ft-consent";
type Consent = "all" | "essential" | null;

const listeners = new Set<() => void>();
const read = (): Consent => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "all" || v === "essential" ? v : null;
  } catch {
    return null;
  }
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
function save(value: Exclude<Consent, null>) {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
  listeners.forEach((l) => l());
}

function loadAnalytics() {
  if (document.getElementById("fdb-analytics")) return;
  const s = document.createElement("script");
  s.id = "fdb-analytics";
  s.defer = true;
  s.dataset.project = "vuosiypexpkpkopkytse";
  s.src = "https://falcondatabase.com/a.js";
  document.head.appendChild(s);
}

const TEXT = {
  es: {
    text: "Usamos cookies esenciales para tu sesión y tu idioma. Si aceptas, también medimos las visitas con una analítica que no usa cookies ni guarda tu IP.",
    more: "Más información",
    essential: "Solo esenciales",
    accept: "Aceptar todas",
  },
  en: {
    text: "We use essential cookies for your session and language. If you accept, we also measure visits with analytics that uses no cookies and does not store your IP.",
    more: "Learn more",
    essential: "Essential only",
    accept: "Accept all",
  },
};

function lang(): "es" | "en" {
  const saved = document.cookie.match(/(?:^|; )ft_lang=(es|en)/)?.[1];
  return (saved as "es" | "en") ?? (navigator.language.toLowerCase().startsWith("en") ? "en" : "es");
}

export function CookieConsent() {
  // En el servidor (y antes de hidratar) no se sabe: no se muestra nada.
  const consent = useSyncExternalStore(subscribe, read, () => "pending" as const);

  useEffect(() => {
    if (consent === "all") loadAnalytics();
  }, [consent]);

  if (consent !== null) return null;
  const t = TEXT[lang()];
  return (
    <div role="dialog" aria-live="polite" aria-label="Cookies" className="fixed bottom-4 left-4 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl print:hidden">
      <p className="text-sm text-slate-700">
        🍪 {t.text}{" "}
        <Link href="/cookies" className="font-medium text-teal-700 hover:underline">{t.more}</Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => save("essential")} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {t.essential}
        </button>
        <button type="button" onClick={() => save("all")} className="flex-1 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
          {t.accept}
        </button>
      </div>
    </div>
  );
}

/** Botón para volver a mostrar el aviso y cambiar la elección (página de cookies). */
export function ResetConsent({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem(KEY);
        } catch {}
        listeners.forEach((l) => l());
      }}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}
