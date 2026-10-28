"use client";

import { useEffect, useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "@/lib/theme-script";

type Theme = "light" | "dark" | "system";
function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const NEXT: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
// Iconos de línea (estilo Lucide), en el color del texto.
const ICON: Record<Theme, React.ReactNode> = {
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </>
  ),
  dark: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  system: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
};
const LABEL: Record<Theme, string> = { light: "Claro / Light", dark: "Oscuro / Dark", system: "Sistema / System" };

// Tema guardado como store externo: el servidor no lo conoce (null) y el
// cliente lo lee de localStorage, sin desajustes de hidratación.
const listeners = new Set<() => void>();
function readTheme(): Theme {
  try {
    return (localStorage.getItem(KEY) as Theme) || "system";
  } catch {
    return "system";
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
  apply(theme);
  listeners.forEach((l) => l());
}

/** Botón que alterna claro → oscuro → sistema. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);

  // En modo sistema, sigue los cambios del sistema operativo en vivo.
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readTheme() === "system") apply("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  if (!theme) return <span className="inline-block size-8" />;
  return (
    <button
      type="button"
      title={`Tema: ${LABEL[theme]}`}
      aria-label={`Tema: ${LABEL[theme]}`}
      onClick={() => saveTheme(NEXT[theme])}
      className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden>
        {ICON[theme]}
      </svg>
    </button>
  );
}
