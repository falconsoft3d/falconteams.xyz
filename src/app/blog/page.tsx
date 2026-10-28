import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BlogBrowser, type BlogCard } from "@/components/blog-browser";
import { PublicHeaderAsync } from "@/components/public-header-async";
import { POSTS } from "@/lib/blog-content";

export const metadata: Metadata = {
  title: "Blog · FalconTeams",
  description: "Guías sobre control horario, registro de jornada, gestión de equipos, facturación por horas y reclutamiento con IA.",
  alternates: { canonical: "/blog" },
};

// Texto plano de cada artículo, para el buscador.
const cards: BlogCard[] = POSTS.map((p) => ({
  slug: p.slug,
  title: p.title,
  description: p.description,
  date: p.date,
  minutes: p.minutes,
  tags: p.tags,
  text: p.body.map((b) => ("h2" in b ? b.h2 : "p" in b ? b.p : "quote" in b ? b.quote : b.list.join(" "))).join(" "),
}));

function BlogBrowserFallback() {
  return (
    <ul className="mt-10 grid gap-5 md:grid-cols-2">
      {POSTS.map((p) => (
        <li key={p.slug} className="rounded-2xl border border-slate-200 bg-white p-6">
          <Link href={`/blog/${p.slug}`} className="text-xl font-semibold text-slate-900">{p.title}</Link>
          <p className="mt-2 text-slate-600">{p.description}</p>
        </li>
      ))}
    </ul>
  );
}

export default function BlogPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeaderAsync />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Blog</h1>
        <p className="mt-2 text-lg text-slate-600">Ideas y guías sobre control horario, gestión de equipos, facturación y reclutamiento.</p>
        {/* El buscador lee los filtros de la URL: va dentro de Suspense para no bloquear el prerenderizado. */}
        <Suspense fallback={<BlogBrowserFallback />}>
          <BlogBrowser posts={cards} />
        </Suspense>
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        FalconTeams · <Link href="/" className="hover:text-teal-700">Inicio</Link> · <Link href="/docs" className="hover:text-teal-700">Documentación</Link> · <Link href="/contact" className="hover:text-teal-700">Contacto</Link>
      </footer>
    </div>
  );
}
