import "server-only";
import * as db from "./fdb";

// Correo interno entre los miembros de una empresa (y los admins), sin servidor
// de correo: cada mensaje se guarda una vez (internal_mails) y cada participante
// tiene su copia en su buzón (internal_mailboxes: «inbox» o «sent», con su lectura).

export type InternalMail = {
  id: number;
  created_at: string;
  company_id: number | null;
  sender_id: number;
  subject: string;
  body: string;
  /** Nombres de los destinatarios, para mostrarlos sin más consultas. */
  to_names: string | null;
  reply_to_id: number | null;
};

export type MailboxRow = { id: number; mail_id: number; user_id: number; folder: "inbox" | "sent"; read_at: string | null };

export type MailboxItem = InternalMail & { boxId: number; read: boolean };

/** Mensajes de una carpeta del usuario, del más reciente al más antiguo. */
export async function listFolder(userId: number, folder: "inbox" | "sent", companyId: number | null) {
  const boxes = await db.queryAll<MailboxRow>("internal_mailboxes", { filters: { user_id: userId, folder: `eq.${folder}` } });
  if (!boxes.length) return [];
  const mails = await db.queryAll<InternalMail>("internal_mails", { filters: { id: `in.(${boxes.map((b) => b.mail_id).join(",")})` } });
  const byId = new Map(mails.map((m) => [m.id, m]));
  return boxes
    .map((b) => {
      const mail = byId.get(b.mail_id);
      return mail ? { ...mail, boxId: b.id, read: !!b.read_at || folder === "sent" } : null;
    })
    .filter((m): m is MailboxItem => !!m && (companyId === null || m.company_id === companyId))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function unreadCount(userId: number) {
  const { count } = await db.query("internal_mailboxes", { filters: { user_id: userId, folder: "eq.inbox", read_at: "is.null" }, select: ["id"], limit: 1 });
  return count;
}

/** Mensaje visible para el usuario (solo si está en alguno de sus buzones). Marca como leído. */
export async function openMail(userId: number, mailId: number) {
  const box = await db.queryOne<MailboxRow>("internal_mailboxes", { user_id: userId, mail_id: mailId });
  if (!box) return null;
  const mail = await db.queryOne<InternalMail>("internal_mails", { id: mailId });
  if (!mail) return null;
  if (box.folder === "inbox" && !box.read_at) await db.update("internal_mailboxes", box.id, { read_at: new Date().toISOString() });
  return { ...mail, folder: box.folder, boxId: box.id };
}

export async function sendInternalMail(input: {
  companyId: number | null;
  senderId: number;
  recipientIds: number[];
  toNames: string;
  subject: string;
  body: string;
  replyToId: number | null;
}) {
  const [mail] = await db.insert<InternalMail>("internal_mails", [
    {
      company_id: input.companyId,
      sender_id: input.senderId,
      subject: input.subject,
      body: input.body,
      to_names: input.toNames,
      reply_to_id: input.replyToId,
    },
  ]);
  await db.insert("internal_mailboxes", [
    { mail_id: mail.id, user_id: input.senderId, folder: "sent", read_at: new Date().toISOString() },
    ...input.recipientIds.map((user_id) => ({ mail_id: mail.id, user_id, folder: "inbox" })),
  ]);
  return mail;
}

/** Quita el mensaje del buzón del usuario (los demás conservan su copia). */
export async function removeFromMailbox(userId: number, boxId: number) {
  const box = await db.queryOne<MailboxRow>("internal_mailboxes", { id: boxId });
  if (!box || box.user_id !== userId) throw new Error("Mensaje no encontrado.");
  await db.remove("internal_mailboxes", [box.id]);
}
