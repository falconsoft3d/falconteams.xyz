"use client";

import { useState, type ReactNode } from "react";
import { DICTIONARIES } from "@/lib/i18n";

/** Días plegados tras "Ver más", paginados (cada página llega ya renderizada del servidor). */
export function MoreDays({ pages, total, firstIndex, pageSize, labels = DICTIONARIES.es.entries }: {
  pages: ReactNode[];
  total: number;
  /** Posición (1-based) del primer día plegado dentro de la lista completa. */
  firstIndex: number;
  pageSize: number;
  labels?: (typeof DICTIONARIES)["es"]["entries"];
}) {
  const fill = (text: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), text);
  const [page, setPage] = useState(0);
  const from = firstIndex + page * pageSize;
  const to = Math.min(from + pageSize - 1, firstIndex + total - 1);
  const pager = "rounded-lg px-3 py-1.5 font-medium text-teal-700 hover:bg-teal-50 disabled:invisible";

  return (
    <details className="group border-t border-slate-100">
      <summary className="flex cursor-pointer list-none items-center justify-center gap-1 rounded-lg py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">{fill(labels.seeMore, { n: total, days: total === 1 ? labels.day : labels.days })}</span>
        <span className="hidden group-open:inline">{labels.seeLess}</span>
        <span aria-hidden className="transition group-open:rotate-180">▾</span>
      </summary>
      {pages[page]}
      {pages.length > 1 && (
        <nav aria-label="Paginación de días" className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
          <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0} className={pager}>
            {labels.newer}
          </button>
          <span className="text-slate-500">
            {fill(labels.pageInfo, { from, to, total: firstIndex + total - 1, page: page + 1, pages: pages.length })}
          </span>
          <button type="button" onClick={() => setPage(page + 1)} disabled={page === pages.length - 1} className={pager}>
            {labels.older}
          </button>
        </nav>
      )}
    </details>
  );
}
