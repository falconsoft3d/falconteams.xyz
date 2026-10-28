import { chatScope, contactsFor, getCompanyAi, unreadBySender } from "@/lib/chat";
import { json, preflight, sessionOrBearerUser } from "@/lib/ext-api";
import { avatarUrl } from "@/lib/session";

// Contactos del chat (flotante y extensión) con sus mensajes sin leer. ?company=<slug> (opcional para el admin).

export const OPTIONS = preflight;
export async function GET(request: Request) {
  const user = await sessionOrBearerUser(request);
  if (!user) return json({ error: "Sesión caducada" }, 401);
  const company = await chatScope(user, new URL(request.url).searchParams.get("company") ?? "");
  if (company === undefined) return json({ error: "No autorizado" }, 403);

  const [contacts, unread, ai] = await Promise.all([
    contactsFor(user, company),
    unreadBySender(user.userId),
    company ? getCompanyAi(company.id) : null,
  ]);
  const list = contacts
    .map((p) => ({ id: p.user_id, name: p.full_name || p.email, role: p.role, avatarUrl: avatarUrl(p), unread: unread.get(p.user_id) ?? 0 }))
    .sort((a, b) => b.unread - a.unread || a.name.localeCompare(b.name));
  return json({ contacts: list, ai: !!ai?.enabled && !!ai.api_key_enc, unread: list.reduce((s, c) => s + c.unread, 0) });
}
