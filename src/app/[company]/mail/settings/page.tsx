import { Suspense } from "react";
import Link from "next/link";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { MailPrivacyNotice, MailSettingsForm } from "@/components/mail";
import { pageTitle } from "@/components/ui";
import { getMailAccount } from "@/lib/data";
import { requireCompanyEmployee } from "@/lib/session";

export default function MailSettingsPage(props: PageProps<"/[company]/mail/settings">) {
  return (
    <Suspense fallback={<Loading />}>
      <MailSettings {...props} />
    </Suspense>
  );
}

async function MailSettings({ params }: PageProps<"/[company]/mail/settings">) {
  const { company: slug } = await params;
  const { user, company } = await requireCompanyEmployee(slug);
  const account = await getMailAccount(user.userId);
  return (
    <EmployeeShell user={user} company={company}>
      <Link href={`/${slug}/mail`} className="text-sm text-slate-500 hover:text-teal-700">← Correo</Link>
      <h1 className={pageTitle}>Configurar mi correo</h1>
      <MailPrivacyNotice />
      <MailSettingsForm account={account} defaultEmail={user.email} />
    </EmployeeShell>
  );
}
