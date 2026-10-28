import "server-only";
import * as db from "./fdb";
import { aiComplete } from "./ai";
import { getCompanyBySlug, listProfiles, type Company, type Profile } from "./data";
import type { CurrentUser } from "./session";

// Chat entre usuarios de una empresa (y sus admins) y con el agente IA de la
// empresa. Las conversaciones se identifican con una clave:
//   dm:<idMenor>-<idMayor>      mensajes directos entre dos usuarios
//   ai:<empresa>:<usuario>      conversación de un usuario con el agente IA

export type ChatMessage = {
  id: number;
  created_at: string;
  conversation: string;
  company_id: number | null;
  sender_id: number;
  recipient_id: number | null;
  role: "user" | "assistant";
  content: string;
  read_at: string | null;
};

export type CompanyAi = {
  id: number;
  company_id: number;
  enabled: boolean;
  api_key_enc: string | null;
  model: string;
  system_prompt: string | null;
};

export const dmKey = (a: number, b: number) => `dm:${Math.min(a, b)}-${Math.max(a, b)}`;
export const aiKey = (companyId: number, userId: number) => `ai:${companyId}:${userId}`;

/** Empresa del slug si el usuario es miembro (empleado de ella o admin). */
export async function chatCompany(user: CurrentUser, slug: string) {
  const company = await getCompanyBySlug(slug);
  if (!company) return null;
  if (user.role === "admin") return company;
  return user.company?.id === company.id && company.active ? company : null;
}

/**
 * Ámbito del chat: la empresa indicada (si el usuario es miembro), la del
 * empleado si no se indica, o ninguna para el admin fuera de una empresa
 * (entonces puede hablar con todos). undefined = sin acceso.
 */
export async function chatScope(user: CurrentUser, slug: string): Promise<Company | null | undefined> {
  if (slug) return (await chatCompany(user, slug)) ?? undefined;
  if (user.role === "admin") return null;
  return user.company?.active ? user.company : undefined;
}

/**
 * Con quién puede hablar: compañeros activos de la empresa y los admins; el
 * admin fuera de una empresa, con todos.
 */
export async function contactsFor(user: CurrentUser, company: Company | null) {
  const profiles = await listProfiles();
  return profiles.filter(
    (p) => p.active && p.user_id !== user.userId && (!company || p.role === "admin" || p.company_id === company.id),
  );
}

export async function getContact(user: CurrentUser, company: Company | null, userId: number): Promise<Profile | null> {
  return (await contactsFor(user, company)).find((p) => p.user_id === userId) ?? null;
}

/** Últimos mensajes de una conversación (o los posteriores a afterId), en orden. */
export async function listChatMessages(conversation: string, afterId = 0) {
  if (afterId > 0) {
    return db.queryAll<ChatMessage>("chat_messages", { filters: { conversation: `eq.${conversation}`, id: `gt.${afterId}` }, order: "id" });
  }
  const { data } = await db.query<ChatMessage>("chat_messages", { filters: { conversation: `eq.${conversation}` }, order: "id.desc", limit: 100 });
  return data.reverse();
}

export async function markRead(messages: ChatMessage[], readerId: number) {
  const unread = messages.filter((m) => m.recipient_id === readerId && !m.read_at);
  const now = new Date().toISOString();
  await Promise.all(unread.map((m) => db.update("chat_messages", m.id, { read_at: now })));
}

/** Mensajes sin leer por remitente. */
export async function unreadBySender(userId: number) {
  const rows = await db.queryAll<{ sender_id: number }>("chat_messages", {
    filters: { recipient_id: userId, read_at: "is.null" },
    select: ["sender_id"],
  });
  const counts = new Map<number, number>();
  for (const r of rows) counts.set(r.sender_id, (counts.get(r.sender_id) ?? 0) + 1);
  return counts;
}

export async function saveMessage(values: Omit<ChatMessage, "id" | "created_at" | "read_at">) {
  const [msg] = await db.insert<ChatMessage>("chat_messages", [values]);
  return msg;
}

// ---------- Agente IA (OpenAI) ----------

/** Configuración del agente IA de todas las empresas (para el listado de empresas). */
export async function listCompanyAi() {
  const rows = await db.queryAll<CompanyAi>("company_ai", {});
  return new Map(rows.map((r) => [r.company_id, r]));
}

export function getCompanyAi(companyId: number) {
  return db.queryOne<CompanyAi>("company_ai", { company_id: companyId });
}

export async function saveCompanyAi(companyId: number, values: Partial<Omit<CompanyAi, "id" | "company_id">>) {
  const existing = await getCompanyAi(companyId);
  if (existing) return db.update("company_ai", existing.id, values);
  return db.insert("company_ai", [{ company_id: companyId, ...values }]);
}

export const defaultPrompt = (company: Company) =>
  `Eres el asistente de ${company.name} en FalconTeams, la herramienta de control horario y gestión del equipo. ` +
  "Responde de forma breve, clara y útil, en el idioma en que te escriban.";

/** Pide la respuesta del agente con el historial reciente de la conversación. */
export async function askAi(ai: CompanyAi, company: Company, user: CurrentUser, history: ChatMessage[]) {
  return aiComplete(ai, [
    { role: "system", content: `${ai.system_prompt || defaultPrompt(company)}\nEstás hablando con ${user.name}.` },
    ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
  ]);
}
