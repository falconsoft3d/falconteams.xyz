import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { Loading } from "@/components/loading";
import { btnSecondary, btnSmall, card, pageTitle } from "@/components/ui";
import { markContactRead } from "@/lib/actions";
import { queryAll } from "@/lib/fdb";
import { requireAdmin } from "@/lib/session";

type ContactMessage = { id: number; created_at: string; name: string; email: string; company: string | null; message: string; read: boolean };

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Mensajes de contacto</h1>
      <Suspense fallback={<Loading />}>
        <Messages />
      </Suspense>
    </div>
  );
}

async function Messages() {
  await requireAdmin();
  const messages = await queryAll<ContactMessage>("contact_messages", { order: "created_at.desc" });
  const unread = messages.filter((m) => !m.read).length;
  const when = (iso: string) =>
    new Intl.DateTimeFormat("es-ES", { timeZone: process.env.APP_TIMEZONE ?? "Europe/Madrid", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  if (!messages.length) return <p className={`${card} text-sm text-slate-500`}>Todavía no hay mensajes. Llegan desde la página pública /contact.</p>;
  return (
    <>
      <p className="text-slate-500">{messages.length} mensajes · {unread} sin leer</p>
      <div className="space-y-3">
        {messages.map((m) => (
          <article key={m.id} className={`${card} ${m.read ? "" : "border-teal-300 ring-1 ring-teal-200"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">
                  {!m.read && <span className="mr-2 inline-block size-2 rounded-full bg-teal-600 align-middle" aria-label="sin leer" />}
                  {m.name}
                  {m.company && <span className="font-normal text-slate-500"> · {m.company}</span>}
                </p>
                <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: tu mensaje a FalconTeams")}`} className="text-sm text-teal-700 hover:underline">{m.email}</a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{when(m.created_at)}</span>
                <ActionForm action={markContactRead} showOk={false}>
                  <input type="hidden" name="message_id" value={m.id} />
                  <input type="hidden" name="read" value={String(!m.read)} />
                  <button className={`${btnSecondary} ${btnSmall}`}>{m.read ? "Marcar no leído" : "Marcar leído"}</button>
                </ActionForm>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-slate-700">{m.message}</p>
          </article>
        ))}
      </div>
    </>
  );
}
