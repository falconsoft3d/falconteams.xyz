import Link from "next/link";

/** Pestañas del correo: interno (siempre) y externo IMAP (solo empleados). */
export function MailTabs({ slug, active, external }: { slug: string; active: "internal" | "external"; external: boolean }) {
  const tab = (on: boolean) => `rounded-lg px-3 py-1.5 text-sm font-medium ${on ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`;
  return (
    <nav className="inline-flex rounded-xl bg-slate-100 p-1" aria-label="Tipo de correo">
      <Link href={`/${slug}/inbox`} className={tab(active === "internal")}>✉️ Correo interno</Link>
      {external && <Link href={`/${slug}/mail`} className={tab(active === "external")}>🌐 Correo externo (IMAP)</Link>}
    </nav>
  );
}
