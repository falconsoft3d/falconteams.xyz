import Link from "next/link";
import { ActionForm } from "./action-form";
import { btnDanger, btnPrimary, btnSecondary, btnSmall, card, input, label } from "./ui";
import { removeMailSettings, saveMailSettings, sendMailAction } from "@/lib/actions";
import { getMessage, listFolders, listMessages, type MailAccount } from "@/lib/mail";

const PAGE_SIZE = 25;

const shortDate = (value: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat("es-ES", { timeZone: process.env.APP_TIMEZONE ?? "Europe/Madrid", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
};

function MailError({ error }: { error: unknown }) {
  return (
    <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
      {error instanceof Error ? error.message : "No se pudo leer el buzón."}
    </p>
  );
}

/** Aviso de transparencia: el admin puede acceder a los buzones (RGPD). */
export function MailPrivacyNotice() {
  return (
    <p className="rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-800">
      Aviso: la administración de la empresa puede consultar los correos de este buzón.
    </p>
  );
}

/** Bandeja: carpetas a la izquierda y lista de mensajes paginada. */
export async function Mailbox({ account, basePath, folder, page }: {
  account: MailAccount;
  /** Ruta de la bandeja; los mensajes se abren en `${basePath}/<uid>`. */
  basePath: string;
  folder: string;
  page: number;
}) {
  let folders, result;
  try {
    [folders, result] = await Promise.all([listFolders(account), listMessages(account, folder, page, PAGE_SIZE)]);
  } catch (err) {
    return <MailError error={err} />;
  }
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const q = (f: string, p = 1) => `?folder=${encodeURIComponent(f)}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="grid gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
      <nav className={`${card} h-fit p-2!`} aria-label="Carpetas">
        {folders.map((f) => (
          <Link
            key={f.path}
            href={`${basePath}${q(f.path)}`}
            className={`block truncate rounded-lg px-3 py-1.5 text-sm ${f.path === folder ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {f.path === "INBOX" ? "📥 Bandeja de entrada" : f.specialUse === "\\Sent" ? `📤 ${f.name}` : f.specialUse === "\\Trash" ? `🗑️ ${f.name}` : `📁 ${f.name}`}
          </Link>
        ))}
      </nav>
      <section className={`${card} p-0!`}>
        {result.messages.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No hay mensajes en esta carpeta.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {result.messages.map((m) => (
              <li key={m.uid}>
                <Link href={`${basePath}/${m.uid}${q(folder)}`} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                  <span className={`truncate ${m.seen ? "text-slate-600" : "font-semibold text-slate-900"}`}>{m.from}</span>
                  <span className={`truncate ${m.seen ? "text-slate-600" : "font-semibold text-slate-900"}`}>{m.subject}</span>
                  <span className="whitespace-nowrap text-xs text-slate-500">{shortDate(m.date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-sm">
            {page > 1 ? <Link href={`${basePath}${q(folder, page - 1)}`} className="text-teal-700 hover:underline">← Más recientes</Link> : <span />}
            <span className="text-slate-500">Página {page} de {pages} · {result.total} mensajes</span>
            {page < pages ? <Link href={`${basePath}${q(folder, page + 1)}`} className="text-teal-700 hover:underline">Más antiguos →</Link> : <span />}
          </div>
        )}
      </section>
    </div>
  );
}

/** Mensaje completo. El HTML se muestra en un iframe aislado (sin scripts ni acceso a la app). */
export async function MessageView({ account, folder, uid, markSeen, backHref, attachmentBase, replyHref }: {
  account: MailAccount;
  folder: string;
  uid: number;
  /** Solo el dueño del buzón marca como leído; el admin lo ve sin alterarlo. */
  markSeen: boolean;
  backHref: string;
  attachmentBase: string;
  replyHref?: string;
}) {
  let message;
  try {
    message = await getMessage(account, folder, uid, markSeen);
  } catch (err) {
    return <MailError error={err} />;
  }
  if (!message) return <p className={`${card} text-sm text-slate-500`}>El mensaje no existe o se ha movido.</p>;
  const html = message.html
    ? `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font-family:system-ui,sans-serif;font-size:14px;color:#0f172a;margin:16px;word-break:break-word}img{max-width:100%;height:auto}</style></head><body>${message.html}</body></html>`
    : null;

  return (
    <article className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={backHref} className="text-sm text-slate-500 hover:text-teal-700">← Volver</Link>
        {replyHref && <Link href={replyHref} className={`${btnSecondary} ${btnSmall}`}>↩ Responder</Link>}
      </div>
      <h2 className="mt-3 text-xl font-semibold text-slate-900">{message.subject}</h2>
      <dl className="mt-2 grid grid-cols-[4rem_1fr] gap-x-2 text-sm text-slate-600">
        <dt className="text-slate-400">De</dt><dd>{message.from}</dd>
        <dt className="text-slate-400">Para</dt><dd>{message.to}</dd>
        {message.cc && (<><dt className="text-slate-400">CC</dt><dd>{message.cc}</dd></>)}
        <dt className="text-slate-400">Fecha</dt><dd>{shortDate(message.date)}</dd>
      </dl>
      {message.attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.attachments.map((a, i) => (
            <a key={i} href={`${attachmentBase}&uid=${uid}&i=${i}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50">
              📎 {a.filename} <span className="text-xs text-slate-400">{Math.ceil(a.size / 1024)} KB</span>
            </a>
          ))}
        </div>
      )}
      <div className="mt-4 border-t border-slate-100 pt-4">
        {html ? (
          <iframe
            title="Contenido del mensaje"
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={html}
            className="h-[65vh] w-full rounded-lg border border-slate-100"
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">{message.text}</pre>
        )}
      </div>
    </article>
  );
}

export function ComposeForm({ to = "", subject = "", inReplyTo, quote }: { to?: string; subject?: string; inReplyTo?: string; quote?: string }) {
  return (
    <section className={card}>
      <ActionForm action={sendMailAction} className="space-y-3">
        {inReplyTo && <input type="hidden" name="in_reply_to" value={inReplyTo} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="to" className={label}>Para</label>
            <input id="to" name="to" required defaultValue={to} placeholder="cliente@empresa.com, otro@…" className={input} />
          </div>
          <div>
            <label htmlFor="cc" className={label}>CC (opcional)</label>
            <input id="cc" name="cc" className={input} />
          </div>
        </div>
        <div>
          <label htmlFor="subject" className={label}>Asunto</label>
          <input id="subject" name="subject" defaultValue={subject} className={input} />
        </div>
        <div>
          <label htmlFor="body" className={label}>Mensaje</label>
          <textarea id="body" name="body" rows={12} defaultValue={quote ? `\n\n${quote}` : ""} className={input} />
        </div>
        <button className={btnPrimary}>Enviar</button>
      </ActionForm>
    </section>
  );
}

/** Configuración IMAP/SMTP. Con profileId, el admin configura el buzón de ese empleado. */
export function MailSettingsForm({ account, profileId, defaultEmail }: { account: MailAccount | null; profileId?: number; defaultEmail: string }) {
  const keep = account ? " (vacía = no cambiar)" : "";
  const server = (kind: "imap" | "smtp", title: string, port: number) => (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">{title}</legend>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <div>
          <label htmlFor={`${kind}_host`} className={label}>Servidor</label>
          <input id={`${kind}_host`} name={`${kind}_host`} required defaultValue={account?.[`${kind}_host`] ?? ""} placeholder={kind === "imap" ? "imap.gmail.com" : "smtp.gmail.com"} className={input} />
        </div>
        <div>
          <label htmlFor={`${kind}_port`} className={label}>Puerto</label>
          <input id={`${kind}_port`} name={`${kind}_port`} type="number" required defaultValue={account?.[`${kind}_port`] ?? port} className={input} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name={`${kind}_secure`} defaultChecked={account?.[`${kind}_secure`] ?? true} className="size-4 accent-teal-700" />
        Conexión cifrada SSL/TLS ({kind === "imap" ? "993" : "465"}); desmárcalo para STARTTLS ({kind === "imap" ? "143" : "587"})
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${kind}_user`} className={label}>Usuario</label>
          <input id={`${kind}_user`} name={`${kind}_user`} defaultValue={account?.[`${kind}_user`] ?? ""} placeholder="normalmente tu email" autoComplete="off" className={input} />
        </div>
        <div>
          <label htmlFor={`${kind}_pass`} className={label}>Contraseña{keep}</label>
          <input id={`${kind}_pass`} name={`${kind}_pass`} type="password" required={!account} autoComplete="new-password" className={input} />
        </div>
      </div>
    </fieldset>
  );

  return (
    <section className={`${card} max-w-3xl space-y-4`}>
      <ActionForm action={saveMailSettings} className="space-y-4">
        {profileId && <input type="hidden" name="profile_id" value={profileId} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="email_address" className={label}>Email</label>
            <input id="email_address" name="email_address" type="email" required defaultValue={account?.email_address ?? defaultEmail} className={input} />
          </div>
          <div>
            <label htmlFor="display_name" className={label}>Nombre del remitente</label>
            <input id="display_name" name="display_name" defaultValue={account?.display_name ?? ""} className={input} />
          </div>
        </div>
        {server("imap", "Entrada (IMAP)", 993)}
        {server("smtp", "Salida (SMTP)", 465)}
        <p className="text-xs text-slate-500">
          Al guardar se prueba la conexión. Con Gmail u Outlook usa una «contraseña de aplicación». Las contraseñas se guardan cifradas.
        </p>
        <button className={btnPrimary}>Probar y guardar</button>
      </ActionForm>
      {account && (
        <ActionForm action={removeMailSettings} showOk={false}>
          {profileId && <input type="hidden" name="profile_id" value={profileId} />}
          <button className={`${btnDanger} ${btnSmall}`}>Desconectar buzón</button>
        </ActionForm>
      )}
    </section>
  );
}
