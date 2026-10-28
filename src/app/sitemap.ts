import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/blog-content";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://falconteams.xyz";

// Páginas públicas y artículos del blog (las ofertas cambian a menudo: se descubren desde /jobs).
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/docs", "/jobs", "/blog", "/contact", "/cookies"].map((path) => ({
    url: `${SITE}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  const posts = POSTS.map((p) => ({ url: `${SITE}/blog/${p.slug}`, lastModified: p.date, changeFrequency: "monthly" as const, priority: 0.6 }));
  return [...pages, ...posts];
}
