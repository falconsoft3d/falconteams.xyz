import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { MessageView } from "@/components/mail";
import { getMailAccount } from "@/lib/data";
import { requireCompanyEmployee } from "@/lib/session";

export default function MessagePage(props: PageProps<"/[company]/mail/[uid]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Message {...props} />
    </Suspense>
  );
}

async function Message({ params, searchParams }: PageProps<"/[company]/mail/[uid]">) {
  const [{ company: slug, uid }, query] = await Promise.all([params, searchParams]);
  const { user, company } = await requireCompanyEmployee(slug);
  const account = await getMailAccount(user.userId);
  if (!account) redirect(`/${slug}/mail/settings`);
  if (!(Number(uid) > 0)) notFound();
  const folder = typeof query.folder === "string" && query.folder ? query.folder : "INBOX";
  const f = encodeURIComponent(folder);

  return (
    <EmployeeShell user={user} company={company}>
      <MessageView
        account={account}
        folder={folder}
        uid={Number(uid)}
        markSeen
        backHref={`/${slug}/mail?folder=${f}`}
        attachmentBase={`/api/mail/attachment?owner=${user.userId}&folder=${f}`}
        replyHref={`/${slug}/mail/compose?reply=${uid}&folder=${f}`}
      />
    </EmployeeShell>
  );
}
