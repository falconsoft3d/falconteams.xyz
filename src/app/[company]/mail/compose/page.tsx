import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ComposeFromQuery } from "@/components/compose-page";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { pageTitle } from "@/components/ui";
import { getMailAccount } from "@/lib/data";
import { requireCompanyEmployee } from "@/lib/session";

export default function ComposePage(props: PageProps<"/[company]/mail/compose">) {
  return (
    <Suspense fallback={<Loading />}>
      <Compose {...props} />
    </Suspense>
  );
}

async function Compose({ params, searchParams }: PageProps<"/[company]/mail/compose">) {
  const [{ company: slug }, query] = await Promise.all([params, searchParams]);
  const { user, company } = await requireCompanyEmployee(slug);
  const account = await getMailAccount(user.userId);
  if (!account) redirect(`/${slug}/mail/settings`);
  const folder = typeof query.folder === "string" && query.folder ? query.folder : "INBOX";

  return (
    <EmployeeShell user={user} company={company}>
      <Link href={`/${slug}/mail`} className="text-sm text-slate-500 hover:text-teal-700">← Correo</Link>
      <h1 className={pageTitle}>Redactar</h1>
      <ComposeFromQuery account={account} reply={Number(query.reply) || undefined} folder={folder} />
    </EmployeeShell>
  );
}
