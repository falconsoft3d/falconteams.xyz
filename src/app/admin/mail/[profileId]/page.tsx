import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { mailboxOf } from "@/components/admin-mail";
import { Loading } from "@/components/loading";
import { Mailbox } from "@/components/mail";
import { pageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/session";

export default function AdminMailboxPage(props: PageProps<"/admin/mail/[profileId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminMailbox {...props} />
    </Suspense>
  );
}

async function AdminMailbox({ params, searchParams }: PageProps<"/admin/mail/[profileId]">) {
  await requireAdmin();
  const [{ profileId }, query] = await Promise.all([params, searchParams]);
  const { profile, account } = await mailboxOf(profileId);
  if (!account) redirect(`/admin/mail/${profile.id}/settings`);
  const folder = typeof query.folder === "string" && query.folder ? query.folder : "INBOX";

  return (
    <div className="space-y-4">
      <Link href="/admin/mail" className="text-sm text-slate-500 hover:text-teal-700">← Buzones</Link>
      <div>
        <h1 className={pageTitle}>Buzón de {profile.full_name || profile.email}</h1>
        <p className="text-slate-500">{account.email_address} · solo lectura, no se marcan como leídos</p>
      </div>
      <Mailbox account={account} basePath={`/admin/mail/${profile.id}`} folder={folder} page={Math.max(1, Number(query.page) || 1)} />
    </div>
  );
}
