import { Suspense } from "react";
import Link from "next/link";
import { AiSettingsForm } from "@/components/ai-settings-form";
import { Avatar } from "@/components/avatar";
import { ChatWindow } from "@/components/chat-window";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { card, pageTitle } from "@/components/ui";
import { contactsFor, getCompanyAi, unreadBySender } from "@/lib/chat";
import { avatarUrl, requireCompanyMember } from "@/lib/session";

export default function ChatPage(props: PageProps<"/[company]/chat">) {
  return (
    <Suspense fallback={<Loading />}>
      <Chat {...props} />
    </Suspense>
  );
}

async function Chat({ params, searchParams }: PageProps<"/[company]/chat">) {
  const [{ company: slug }, query] = await Promise.all([params, searchParams]);
  const { user, company, isAdmin } = await requireCompanyMember(slug);
  const [contacts, ai, unread] = await Promise.all([contactsFor(user, company), getCompanyAi(company.id), unreadBySender(user.userId)]);
  const aiOn = !!ai?.enabled && !!ai.api_key_enc;
  const selected = typeof query.with === "string" ? query.with : aiOn ? "ai" : contacts[0] ? String(contacts[0].user_id) : "";
  const peer = selected === "ai" ? (aiOn ? { name: "Asistente IA", isAi: true } : null) : (() => {
    const c = contacts.find((p) => String(p.user_id) === selected);
    return c ? { name: c.full_name || c.email, isAi: false } : null;
  })();
  const item = (active: boolean) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${active ? "bg-teal-50 font-semibold text-teal-900" : "text-slate-700 hover:bg-slate-50"}`;

  return (
    <EmployeeShell user={user} company={company}>
      <h1 className={pageTitle}>Chat</h1>
      <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
        <nav className={`${card} h-fit space-y-1 p-2!`} aria-label="Conversaciones">
          {aiOn && (
            <Link href={`/${slug}/chat?with=ai`} className={item(selected === "ai")}>
              <span className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-base">🤖</span>
              Asistente IA
            </Link>
          )}
          {contacts.map((c) => (
            <Link key={c.user_id} href={`/${slug}/chat?with=${c.user_id}`} className={item(selected === String(c.user_id))}>
              <Avatar name={c.full_name || c.email} url={avatarUrl(c)} />
              <span className="min-w-0 flex-1 truncate">
                {c.full_name || c.email}
                {c.role === "admin" && <span className="ml-1 text-xs font-normal text-slate-500">(admin)</span>}
              </span>
              {unread.get(c.user_id) ? (
                <span className="rounded-full bg-rose-600 px-1.5 text-xs font-semibold text-white">{unread.get(c.user_id)}</span>
              ) : null}
            </Link>
          ))}
          {!aiOn && contacts.length === 0 && <p className="p-3 text-sm text-slate-500">No hay nadie más con quien hablar todavía.</p>}
        </nav>

        <section className={`${card} p-0!`}>
          {peer ? (
            <>
              <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">
                {peer.name}
                {peer.isAi && <span className="text-xs font-normal text-slate-500">· tus mensajes se envían a OpenAI para generar la respuesta</span>}
              </header>
              <ChatWindow key={selected} company={slug} peer={selected} peerName={peer.name} isAi={peer.isAi} />
            </>
          ) : (
            <p className="p-6 text-sm text-slate-500">Elige una conversación.</p>
          )}
        </section>
      </div>

      {isAdmin && (
        <section className={`${card} max-w-3xl`}>
          <h2 className="mb-1 font-semibold text-slate-900">🤖 Agente IA de {company.name}</h2>
          <p className="mb-4 text-sm text-slate-500">Con un token de OpenAI (ChatGPT), los empleados de la empresa pueden hablar con un asistente desde el chat.</p>
          <AiSettingsForm company={company} ai={ai} />
        </section>
      )}
    </EmployeeShell>
  );
}
