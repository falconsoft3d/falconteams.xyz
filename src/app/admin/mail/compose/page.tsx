import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ComposeFromQuery } from "@/components/compose-page";
import { Loading } from "@/components/loading";
import { pageTitle } from "@/components/ui";
import { getMailAccount } from "@/lib/data";
import { requireAdmin } from "@/lib/session";

export default function AdminComposePage(props: PageProps<"/admin/mail/compose">) {
  return (
    <div className="space-y-4">
      <Link href="/admin/mail" className="text-sm text-slate-500 hover:text-teal-700">← Correo</Link>
      <h1 className={pageTitle}>Redactar</h1>
      <Suspense fallback={<Loading />}>
        <AdminCompose {...props} />
      </Suspense>
    </div>
  );
}

async function AdminCompose({ searchParams }: PageProps<"/admin/mail/compose">) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const account = await getMailAccount(admin.userId);
  if (!account) redirect(`/admin/mail/${admin.profileId}/settings`);
  const folder = typeof query.folder === "string" && query.folder ? query.folder : "INBOX";
  return <ComposeFromQuery account={account} reply={Number(query.reply) || undefined} folder={folder} />;
}
