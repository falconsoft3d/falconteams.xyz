import { Suspense } from "react";
import Link from "next/link";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { Mailbox, MailPrivacyNotice } from "@/components/mail";
import { MailTabs } from "@/components/mail-tabs";
import { btnPrimary, btnSecondary, btnSmall, card, pageTitle } from "@/components/ui";
import { getMailAccount } from "@/lib/data";
import { requireCompanyEmployee } from "@/lib/session";

export default function MailPage(props: PageProps<"/[company]/mail">) {
  return (
    <Suspense fallback={<Loading />}>
      <Mail {...props} />
    </Suspense>
  );
}

async function Mail({ params, searchParams }: PageProps<"/[company]/mail">) {
  const [{ company: slug }, query] = await Promise.all([params, searchParams]);
  const { user, company } = await requireCompanyEmployee(slug);
  const account = await getMailAccount(user.userId);
  const folder = typeof query.folder === "string" && query.folder ? query.folder : "INBOX";
  const page = Math.max(1, Number(query.page) || 1);

  return (
    <EmployeeShell user={user} company={company}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageTitle}>Correo</h1>
          {account && <p className="text-slate-500">{account.email_address}</p>}
        </div>
        {account && (
          <div className="flex gap-2">
            <Link href={`/${slug}/mail/compose`} className={`${btnPrimary} ${btnSmall}`}>✉ Redactar</Link>
            <Link href={`/${slug}/mail/settings`} className={`${btnSecondary} ${btnSmall}`}>Configuración</Link>
          </div>
        )}
      </div>
      <MailTabs slug={slug} active="external" external />
      <MailPrivacyNotice />
      {account ? (
        <Mailbox account={account} basePath={`/${slug}/mail`} folder={folder} page={page} />
      ) : (
        <section className={`${card} max-w-xl`}>
          <p className="text-slate-600">Todavía no has conectado tu buzón de correo.</p>
          <Link href={`/${slug}/mail/settings`} className={`${btnPrimary} mt-3`}>Configurar mi correo</Link>
        </section>
      )}
    </EmployeeShell>
  );
}
