import { Suspense } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { btnPrimary, card, input, label, pageTitle } from "@/components/ui";
import { sendInternalMailAction } from "@/lib/actions";
import { contactsFor } from "@/lib/chat";
import { openMail } from "@/lib/internal-mail";
import { avatarUrl, requireCompanyMember } from "@/lib/session";

export default function ComposePage(props: PageProps<"/[company]/inbox/compose">) {
  return (
    <Suspense fallback={<Loading />}>
      <Compose {...props} />
    </Suspense>
  );
}

async function Compose({ params, searchParams }: PageProps<"/[company]/inbox/compose">) {
  const [{ company: slug }, query] = await Promise.all([params, searchParams]);
  const { user, company } = await requireCompanyMember(slug);
  const contacts = await contactsFor(user, company);
  const original = Number(query.reply) > 0 ? await openMail(user.userId, Number(query.reply)) : null;
  const preselected = new Set([original?.sender_id, Number(query.to) || undefined].filter(Boolean));
  const subject = original ? (/^re:/i.test(original.subject) ? original.subject : `Re: ${original.subject}`) : "";
  const quote = original ? `\n\n— Mensaje original —\n${original.body.split("\n").map((l) => `> ${l}`).join("\n")}` : "";

  return (
    <EmployeeShell user={user} company={company}>
      <Link href={`/${slug}/inbox`} className="text-sm text-slate-500 hover:text-teal-700">← Correo</Link>
      <h1 className={pageTitle}>{original ? "Responder" : "Nuevo mensaje"}</h1>
      <section className={card}>
        <ActionForm action={sendInternalMailAction} className="space-y-4">
          <input type="hidden" name="company" value={slug} />
          {original && <input type="hidden" name="reply_to" value={original.id} />}
          <fieldset>
            <legend className={label}>Para</legend>
            {contacts.length === 0 ? (
              <p className="text-sm text-slate-500">No hay nadie más en la empresa todavía.</p>
            ) : (
              <div className="grid max-h-56 gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2 sm:grid-cols-2">
                {contacts.map((c) => (
                  <label key={c.user_id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 has-[:checked]:bg-teal-50">
                    <input type="checkbox" name="to" value={c.user_id} defaultChecked={preselected.has(c.user_id)} className="size-4 accent-teal-700" />
                    <Avatar name={c.full_name || c.email} url={avatarUrl(c)} size="size-6" />
                    <span className="truncate">{c.full_name || c.email}{c.role === "admin" && <span className="ml-1 text-xs text-slate-500">(admin)</span>}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <div>
            <label htmlFor="subject" className={label}>Asunto</label>
            <input id="subject" name="subject" required maxLength={200} defaultValue={subject} className={input} />
          </div>
          <div>
            <label htmlFor="body" className={label}>Mensaje</label>
            <textarea id="body" name="body" required rows={12} maxLength={20000} defaultValue={quote} className={input} />
          </div>
          <button className={btnPrimary}>Enviar</button>
        </ActionForm>
      </section>
    </EmployeeShell>
  );
}
