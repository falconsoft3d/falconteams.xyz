import { Suspense } from "react";
import Link from "next/link";
import { mailboxOf } from "@/components/admin-mail";
import { Loading } from "@/components/loading";
import { MailSettingsForm } from "@/components/mail";
import { pageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/session";

export default function AdminMailSettingsPage(props: PageProps<"/admin/mail/[profileId]/settings">) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminMailSettings {...props} />
    </Suspense>
  );
}

async function AdminMailSettings({ params }: PageProps<"/admin/mail/[profileId]/settings">) {
  await requireAdmin();
  const { profileId } = await params;
  const { profile, account } = await mailboxOf(profileId);
  return (
    <div className="space-y-4">
      <Link href="/admin/mail" className="text-sm text-slate-500 hover:text-teal-700">← Buzones</Link>
      <h1 className={pageTitle}>Correo de {profile.full_name || profile.email}</h1>
      <MailSettingsForm account={account} profileId={profile.id} defaultEmail={profile.email} />
    </div>
  );
}
