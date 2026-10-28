import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://falconteams.xyz";

export default function robots(): MetadataRoute.Robots {
  return {
    // La parte privada (paneles, API) no se indexa; la pública sí.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
