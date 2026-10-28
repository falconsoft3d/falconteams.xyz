import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { btnDanger, btnPrimary, btnSmall, card } from "@/components/ui";
import { deleteInternalMailAction } from "@/lib/actions";
import { listProfiles } from "@/lib/data";
import { openMail } from "@/lib/internal-mail";
import { avatarUrl, requireCompanyMember } from "@/lib/session";

export default function MailPage(props: PageProps<"/[company]/inbox/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Mail {...props} />
    </Suspense>
  );
}

async function Mail({ params }: PageProps<"/[company]/inbox/[id]">) {
  const { company: slug, id } = await params;
  const { user, company } = await requireCompanyMember(slug);
  const mail = Number(id) > 0 ? await openMail(user.userId, Number(id)) : null;
  if (!mail) notFound();
  const sender = (await listProfiles()).find((p) => p.user_id === mail.sender_id);
  const senderName = sender ? sender.full_name || sender.email : "—";
  const when = new Intl.DateTimeFormat("es-ES", { timeZone: process.env.APP_TIMEZONE ?? "Europe/Madrid", dateStyle: "full", timeStyle: "short" }).format(new Date(mail.created_at));

  return (
    <EmployeeShell user={user} company={company}>
      <Link href={`/${slug}/inbox${mail.folder === "sent" ? "?folder=sent" : ""}`} className="text-sm text-slate-500 hover:text-teal-700">← Correo</Link>
      <article className={card}>
        <h1 className="text-xl font-semibold text-slate-900">{mail.subject}</h1>
        <div className="mt-3 flex items-center gap-3">
          <Avatar name={senderName} url={sender ? avatarUrl(sender) : null} size="size-10" />
          <div className="text-sm">
            <p className="font-medium text-slate-900">{senderName}</p>
            <p className="text-slate-500">Para: {mail.to_names} · {when}</p>
          </div>
        </div>
        <div className="mt-5 whitespace-pre-wrap border-t border-slate-100 pt-5 leading-relaxed text-slate-800">{mail.body}</div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {mail.sender_id !== user.userId && (
            <Link href={`/${slug}/inbox/compose?reply=${mail.id}`} className={`${btnPrimary} ${btnSmall}`}>↩ Responder</Link>
          )}
          <ActionForm action={deleteInternalMailAction} showOk={false}>
            <input type="hidden" name="company" value={slug} />
            <input type="hidden" name="box_id" value={mail.boxId} />
            <button className={`${btnDanger} ${btnSmall}`}>Eliminar</button>
          </ActionForm>
        </div>
      </article>
    </EmployeeShell>
  );
}
