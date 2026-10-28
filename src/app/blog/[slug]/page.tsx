import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeaderAsync } from "@/components/public-header-async";
import { btnPrimary } from "@/components/ui";
import { getPost, POSTS, type BlogBlock } from "@/lib/blog-content";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://falconteams.xyz";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return {
    title: `${post.title} · FalconTeams`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.description, publishedTime: post.date, url: `${SITE}/blog/${post.slug}` },
  };
}

function Block({ block }: { block: BlogBlock }) {
  if ("h2" in block) return <h2 className="mt-10 text-2xl font-bold text-slate-900">{block.h2}</h2>;
  if ("p" in block) return <p className="mt-4 text-lg leading-relaxed text-slate-700">{block.p}</p>;
  if ("quote" in block) {
    return <blockquote className="my-8 border-l-4 border-teal-500 bg-teal-50 px-5 py-4 text-lg font-medium italic text-teal-900">{block.quote}</blockquote>;
  }
  return (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-lg text-slate-700 marker:text-teal-600">
      {block.list.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const date = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(post.date));
  const related = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: "es",
    author: { "@type": "Organization", name: "FalconTeams" },
    mainEntityOfPage: `${SITE}/blog/${post.slug}`,
  };

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeaderAsync />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Link href="/blog" className="text-sm text-slate-500 hover:text-teal-700">← Todos los artículos</Link>
        <article className="mt-6">
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Link key={tag} href={`/blog?cat=${encodeURIComponent(tag)}`} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 hover:bg-teal-100">{tag}</Link>
            ))}
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">{post.title}</h1>
          <p className="mt-3 text-xl text-slate-600">{post.description}</p>
          <p className="mt-4 text-sm text-slate-500">{date} · {post.minutes} min de lectura</p>
          <div className="mt-8 border-t border-slate-200 pt-2">
            {post.body.map((block, i) => <Block key={i} block={block} />)}
          </div>
        </article>

        <aside className="mt-12 rounded-2xl bg-slate-900 p-8 text-center">
          <p className="text-xl font-semibold text-white">Prueba FalconTeams</p>
          <p className="mt-2 text-slate-300">Control horario, proyectos, facturas y reclutamiento en una sola herramienta de código abierto.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/login" className={btnPrimary}>Entrar</Link>
            <Link href="/docs" className="inline-flex items-center rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Documentación</Link>
          </div>
        </aside>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-slate-900">También te puede interesar</h2>
          <ul className="mt-3 space-y-2">
            {related.map((p) => (
              <li key={p.slug}><Link href={`/blog/${p.slug}`} className="text-teal-700 hover:underline">{p.title}</Link></li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
