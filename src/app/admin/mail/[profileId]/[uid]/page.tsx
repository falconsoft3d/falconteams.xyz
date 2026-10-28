import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { mailboxOf } from "@/components/admin-mail";
import { Loading } from "@/components/loading";
import { MessageView } from "@/components/mail";
import { requireAdmin } from "@/lib/session";

export default function AdminMessagePage(props: PageProps<"/admin/mail/[profileId]/[uid]">) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminMessage {...props} />
    </Suspense>
  );
}

async function AdminMessage({ params, searchParams }: PageProps<"/admin/mail/[profileId]/[uid]">) {
  const admin = await requireAdmin();
  const [{ profileId, uid }, query] = await Promise.all([params, searchParams]);
  const { profile, account } = await mailboxOf(profileId);
  if (!account) redirect(`/admin/mail/${profile.id}/settings`);
  if (!(Number(uid) > 0)) notFound();
  const folder = typeof query.folder === "string" && query.folder ? query.folder : "INBOX";
  const f = encodeURIComponent(folder);
  const own = profile.user_id === admin.userId;

  return (
    <MessageView
      account={account}
      folder={folder}
      uid={Number(uid)}
      markSeen={own}
      backHref={`/admin/mail/${profile.id}?folder=${f}`}
      attachmentBase={`/api/mail/attachment?owner=${profile.user_id}&folder=${f}`}
      replyHref={own ? `/admin/mail/compose?reply=${uid}&folder=${f}` : undefined}
    />
  );
}
