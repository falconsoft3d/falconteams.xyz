import { Suspense } from "react";
import Link from "next/link";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { MailTabs } from "@/components/mail-tabs";
import { btnPrimary, btnSmall, card, pageTitle } from "@/components/ui";
import { listProfiles } from "@/lib/data";
import { listFolder } from "@/lib/internal-mail";
import { requireCompanyMember } from "@/lib/session";

export default function InboxPage(props: PageProps<"/[company]/inbox">) {
  return (
    <Suspense fallback={<Loading />}>
      <Inbox {...props} />
    </Suspense>
  );
}

const when = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: process.env.APP_TIMEZONE ?? "Europe/Madrid", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

async function Inbox({ params, searchParams }: PageProps<"/[company]/inbox">) {
  const [{ company: slug }, query] = await Promise.all([params, searchParams]);
  const { user, company, isAdmin } = await requireCompanyMember(slug);
  const folder = query.folder === "sent" ? "sent" : "inbox";
  const [mails, profiles] = await Promise.all([listFolder(user.userId, folder, company.id), listProfiles()]);
  const name = new Map(profiles.map((p) => [p.user_id, p.full_name || p.email]));
  const unread = folder === "inbox" ? mails.filter((m) => !m.read).length : 0;
  const tab = (on: boolean) => `rounded-lg px-3 py-1.5 text-sm ${on ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <EmployeeShell user={user} company={company}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitle}>Correo</h1>
        <MailTabs slug={slug} active="internal" external={!isAdmin} />
      </div>
      {query.sent === "1" && <p className="rounded-xl bg-teal-50 px-4 py-2 text-sm text-teal-800">✓ Mensaje enviado.</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1">
          <Link href={`/${slug}/inbox`} className={tab(folder === "inbox")}>📥 Recibidos{unread ? ` (${unread})` : ""}</Link>
          <Link href={`/${slug}/inbox?folder=sent`} className={tab(folder === "sent")}>📤 Enviados</Link>
        </nav>
        <Link href={`/${slug}/inbox/compose`} className={`${btnPrimary} ${btnSmall}`}>✉ Redactar</Link>
      </div>

      <section className={`${card} p-0!`}>
        {mails.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">{folder === "inbox" ? "No tienes mensajes." : "No has enviado mensajes."}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {mails.map((m) => (
              <li key={m.boxId}>
                <Link href={`/${slug}/inbox/${m.id}`} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50">
                  <span className={`truncate ${m.read ? "text-slate-600" : "font-semibold text-slate-900"}`}>
                    {folder === "sent" ? `Para: ${m.to_names}` : name.get(m.sender_id) ?? "—"}
                  </span>
                  <span className="truncate">
                    <span className={m.read ? "text-slate-700" : "font-semibold text-slate-900"}>{m.subject}</span>
                    <span className="text-slate-400"> — {m.body.slice(0, 90)}</span>
                  </span>
                  <span className="whitespace-nowrap text-xs text-slate-500">{when(m.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </EmployeeShell>
  );
}
