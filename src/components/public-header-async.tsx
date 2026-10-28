import { Suspense } from "react";
import { PublicHeader } from "./public-header";
import { getLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";

/**
 * Cabecera pública que se resuelve en cada petición (idioma y sesión), para
 * páginas cuyo contenido es estático (blog).
 */
export function PublicHeaderAsync() {
  return (
    <Suspense fallback={<div className="h-[57px] border-b border-slate-200 bg-white" />}>
      <HeaderInner />
    </Suspense>
  );
}

async function HeaderInner() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  return <PublicHeader locale={locale} user={user} />;
}
