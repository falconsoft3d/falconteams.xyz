import { Suspense } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Loading } from "@/components/loading";
import { btnPrimary, btnSecondary, btnSmall, card, pageTitle } from "@/components/ui";
import { listCompanies, listMailAccounts, listProfiles } from "@/lib/data";
import { avatarUrl, requireAdmin } from "@/lib/session";

export default function AdminMailPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitle}>Correo</h1>
        <Link href="/admin/mail/compose" className={`${btnPrimary} ${btnSmall}`}>✉ Redactar desde mi buzón</Link>
      </div>
      <Suspense fallback={<Loading />}>
        <Mailboxes />
      </Suspense>
    </div>
  );
}

async function Mailboxes() {
  const admin = await requireAdmin();
  const [profiles, accounts, companies] = await Promise.all([listProfiles(), listMailAccounts(), listCompanies()]);
  const accountOf = new Map(accounts.map((a) => [a.user_id, a]));
  const companyName = new Map(companies.map((c) => [c.id, c.name]));

  return (
    <section className={`${card} p-0!`}>
      <ul className="divide-y divide-slate-100">
        {profiles.map((p) => {
          const account = accountOf.get(p.user_id);
          return (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={p.full_name || p.email} url={avatarUrl(p)} />
                <div>
                  <p className="font-medium text-slate-900">
                    {p.full_name || p.email}
                    {p.user_id === admin.userId && <span className="ml-2 text-xs text-slate-500">(tú)</span>}
                  </p>
                  <p className="text-sm text-slate-500">
                    {account ? account.email_address : "Sin buzón configurado"}
                    {p.company_id ? ` · ${companyName.get(p.company_id)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {account && <Link href={`/admin/mail/${p.id}`} className={`${btnPrimary} ${btnSmall}`}>Ver buzón</Link>}
                <Link href={`/admin/mail/${p.id}/settings`} className={`${btnSecondary} ${btnSmall}`}>{account ? "Configuración" : "Configurar"}</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
