"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type BlogCard = { slug: string; category: string; title: string; description: string; date: string; minutes: number; tags: string[]; text: string };

/** Sin tildes ni mayúsculas, para buscar «registro» y encontrar «Registró». */
const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const date = (iso: string) => new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

/** Listado del blog con buscador y filtro por categoría (en el navegador, sin recargar). */
export function BlogBrowser({ posts, categories: order }: { posts: BlogCard[]; categories: readonly string[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("cat") ?? "");

  const categories = useMemo(
    () => order.map((name) => [name, posts.filter((p) => p.category === name).length] as const).filter(([, n]) => n > 0),
    [order, posts],
  );

  const results = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return posts.filter((p) => {
      if (category && p.category !== category) return false;
      const haystack = normalize(`${p.title} ${p.description} ${p.category} ${p.tags.join(" ")} ${p.text}`);
      return words.every((w) => haystack.includes(w));
    });
  }, [posts, query, category]);

  // La URL refleja el filtro para poder compartirlo.
  function sync(next: { q?: string; cat?: string }) {
    const q = next.q ?? query;
    const cat = next.cat ?? category;
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (cat) search.set("cat", cat);
    router.replace(`${pathname}${search.size ? `?${search}` : ""}`, { scroll: false });
  }

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition ${on ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-teal-400"}`;

  return (
    <>
      <div className="mt-8 space-y-4">
        <label className="relative block">
          <span className="sr-only">Buscar en el blog</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden>
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              sync({ q: e.target.value });
            }}
            placeholder="Buscar artículos: registro de jornada, facturación, IA…"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categorías">
          <button type="button" onClick={() => { setCategory(""); sync({ cat: "" }); }} className={chip(!category)}>
            Todas <span className="opacity-70">({posts.length})</span>
          </button>
          {categories.map(([name, count]) => (
            <button key={name} type="button" onClick={() => { setCategory(name); sync({ cat: name }); }} className={chip(category === name)} aria-pressed={category === name}>
              {name} <span className="opacity-70">({count})</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-500" aria-live="polite">
        {results.length === posts.length ? `${posts.length} artículos` : `${results.length} de ${posts.length} artículos`}
      </p>

      {results.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No hay artículos que coincidan.{" "}
          <button type="button" onClick={() => { setQuery(""); setCategory(""); sync({ q: "", cat: "" }); }} className="font-medium text-teal-700 hover:underline">
            Ver todos
          </button>
        </p>
      ) : (
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {results.map((post) => (
            <article key={post.slug} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-300 hover:shadow-md">
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => { setCategory(post.category); sync({ cat: post.category }); }} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 hover:bg-teal-100">
                  {post.category}
                </button>
                {post.tags.filter((t) => t !== post.category).map((tag) => (
                  <span key={tag} className="text-xs text-slate-400">#{tag.toLowerCase()}</span>
                ))}
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-900 group-hover:text-teal-700">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="mt-2 flex-1 text-slate-600">{post.description}</p>
              <p className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>{date(post.date)} · {post.minutes} min de lectura</span>
                <Link href={`/blog/${post.slug}`} className="font-medium text-teal-700 hover:underline">Leer artículo →</Link>
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
