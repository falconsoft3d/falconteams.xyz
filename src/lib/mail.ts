import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";
import { decrypt } from "./crypto";

// Cliente de correo: lee el buzón por IMAP y envía por SMTP con la cuenta que
// cada usuario (o el admin por él) configura. No se guarda ningún correo: se
// consulta en vivo al servidor del usuario.

export type MailAccount = {
  id: number;
  user_id: number;
  email_address: string;
  display_name: string | null;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_user: string;
  imap_pass_enc: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass_enc: string;
};

export type ServerSettings = { host: string; port: number; secure: boolean; user: string; pass: string };

const IMAP_PORTS = new Set([143, 993]);
const SMTP_PORTS = new Set([25, 465, 587, 2525]);

/** true para direcciones de red privada, loopback, link-local, etc. */
function isPrivateAddress(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

/**
 * Evita que la app se use para conectarse a la red interna (SSRF): solo puertos
 * de correo y hosts que resuelven a direcciones públicas.
 */
async function assertPublicServer(host: string, port: number, ports: Set<number>, kind: string) {
  if (!ports.has(port)) throw new Error(`Puerto ${kind} no permitido (usa ${[...ports].join(", ")}).`);
  if (!/^[a-z0-9.-]+$/i.test(host)) throw new Error(`El servidor ${kind} no es válido.`);
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new Error(`No se encuentra el servidor ${kind} «${host}».`);
  }
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error(`El servidor ${kind} «${host}» apunta a una red privada.`);
  }
}

function imapClient(s: ServerSettings) {
  return new ImapFlow({
    host: s.host,
    port: s.port,
    secure: s.secure,
    auth: { user: s.user, pass: s.pass },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
}

const settingsOf = (a: MailAccount) => ({
  imap: { host: a.imap_host, port: a.imap_port, secure: a.imap_secure, user: a.imap_user, pass: decrypt(a.imap_pass_enc) },
  smtp: { host: a.smtp_host, port: a.smtp_port, secure: a.smtp_secure, user: a.smtp_user, pass: decrypt(a.smtp_pass_enc) },
});

async function withImap<T>(account: MailAccount, fn: (client: ImapFlow) => Promise<T>) {
  const { imap } = settingsOf(account);
  await assertPublicServer(imap.host, imap.port, IMAP_PORTS, "IMAP");
  const client = imapClient(imap);
  try {
    await client.connect();
  } catch (err) {
    throw new Error(`No se pudo conectar al buzón: ${err instanceof Error ? err.message : "error desconocido"}.`);
  }
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => {});
  }
}

/** Prueba la conexión IMAP y SMTP antes de guardar una configuración. */
export async function testMailSettings(imap: ServerSettings, smtp: ServerSettings) {
  await assertPublicServer(imap.host, imap.port, IMAP_PORTS, "IMAP");
  await assertPublicServer(smtp.host, smtp.port, SMTP_PORTS, "SMTP");
  const client = imapClient(imap);
  try {
    await client.connect();
  } catch (err) {
    throw new Error(`IMAP: ${err instanceof Error ? err.message : "no se pudo conectar"}. Revisa servidor, puerto y credenciales.`);
  } finally {
    await client.logout().catch(() => {});
  }
  const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.pass }, connectionTimeout: 15000 });
  try {
    await transport.verify();
  } catch (err) {
    throw new Error(`SMTP: ${err instanceof Error ? err.message : "no se pudo conectar"}. Revisa servidor, puerto y credenciales.`);
  } finally {
    transport.close();
  }
}

export type MailFolder = { path: string; name: string; specialUse: string | null };

export async function listFolders(account: MailAccount): Promise<MailFolder[]> {
  return withImap(account, async (client) => {
    const folders = await client.list();
    return folders
      .filter((f) => !f.flags?.has("\\Noselect"))
      .map((f) => ({ path: f.path, name: f.name, specialUse: f.specialUse ?? null }))
      .sort((a, b) => (a.path === "INBOX" ? -1 : b.path === "INBOX" ? 1 : a.name.localeCompare(b.name)));
  });
}

export type MailSummary = {
  uid: number;
  subject: string;
  from: string;
  date: string | null;
  seen: boolean;
  size: number;
};

/** Página de mensajes de una carpeta, del más reciente al más antiguo. */
export async function listMessages(account: MailAccount, folder: string, page: number, pageSize = 25) {
  return withImap(account, async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      const total = client.mailbox ? client.mailbox.exists : 0;
      const end = total - (page - 1) * pageSize;
      if (end < 1) return { total, messages: [] as MailSummary[] };
      const start = Math.max(1, end - pageSize + 1);
      const messages: MailSummary[] = [];
      for await (const msg of client.fetch(`${start}:${end}`, { uid: true, envelope: true, flags: true, internalDate: true, size: true })) {
        const from = msg.envelope?.from?.[0];
        messages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject || "(sin asunto)",
          from: from ? from.name || from.address || "" : "",
          date: (msg.envelope?.date ?? msg.internalDate)?.toString() ?? null,
          seen: msg.flags?.has("\\Seen") ?? false,
          size: msg.size ?? 0,
        });
      }
      return { total, messages: messages.reverse() };
    } finally {
      lock.release();
    }
  });
}

export type MailMessage = {
  uid: number;
  subject: string;
  from: string;
  to: string;
  cc: string;
  date: string | null;
  html: string | null;
  text: string | null;
  attachments: { filename: string; contentType: string; size: number }[];
};

async function fetchParsed(account: MailAccount, folder: string, uid: number, markSeen: boolean) {
  return withImap(account, async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      // fetchOne usa BODY.PEEK: leer no marca el mensaje como leído.
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !msg.source) return null;
      if (markSeen) await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true }).catch(() => {});
      return simpleParser(msg.source);
    } finally {
      lock.release();
    }
  });
}

/** Lee un mensaje. Solo lo marca como leído si lo abre el dueño del buzón. */
export async function getMessage(account: MailAccount, folder: string, uid: number, markSeen: boolean): Promise<MailMessage | null> {
  const parsed = await fetchParsed(account, folder, uid, markSeen);
  if (!parsed) return null;
  const addr = (v: typeof parsed.to) => (Array.isArray(v) ? v.map((x) => x.text).join(", ") : v?.text ?? "");
  return {
    uid,
    subject: parsed.subject || "(sin asunto)",
    from: parsed.from?.text ?? "",
    to: addr(parsed.to),
    cc: addr(parsed.cc),
    date: parsed.date?.toISOString() ?? null,
    html: typeof parsed.html === "string" ? parsed.html : null,
    text: parsed.text ?? null,
    attachments: parsed.attachments.map((a) => ({ filename: a.filename || "adjunto", contentType: a.contentType, size: a.size })),
  };
}

export async function getAttachment(account: MailAccount, folder: string, uid: number, index: number) {
  const parsed = await fetchParsed(account, folder, uid, false);
  const att = parsed?.attachments[index];
  return att ? { filename: att.filename || "adjunto", contentType: att.contentType, content: att.content } : null;
}

/** Envía un correo por SMTP y, si el servidor lo permite, guarda copia en «Enviados». */
export async function sendMail(account: MailAccount, mail: { to: string; cc?: string; subject: string; text: string; inReplyTo?: string }) {
  const { smtp } = settingsOf(account);
  await assertPublicServer(smtp.host, smtp.port, SMTP_PORTS, "SMTP");
  const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.pass }, connectionTimeout: 15000 });
  const from = account.display_name ? `"${account.display_name.replace(/"/g, "")}" <${account.email_address}>` : account.email_address;
  const message = { from, to: mail.to, cc: mail.cc || undefined, subject: mail.subject, text: mail.text, inReplyTo: mail.inReplyTo };
  try {
    await transport.sendMail(message);
  } catch (err) {
    throw new Error(`No se pudo enviar: ${err instanceof Error ? err.message : "error SMTP"}.`);
  } finally {
    transport.close();
  }
  // Copia en la carpeta de enviados (muchos servidores no la guardan solos por SMTP).
  try {
    const raw = await new Promise<Buffer>((resolve, reject) =>
      nodemailer.createTransport({ streamTransport: true, buffer: true }).sendMail(message, (err, info) =>
        err ? reject(err) : resolve(info.message as Buffer),
      ),
    );
    await withImap(account, async (client) => {
      const sent = (await client.list()).find((f) => f.specialUse === "\\Sent");
      if (sent) await client.append(sent.path, raw, ["\\Seen"]);
    });
  } catch {
    // La copia en «Enviados» es opcional: el correo ya se ha enviado.
  }
}
