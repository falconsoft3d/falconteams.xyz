import { aiKey, askAi, chatScope, dmKey, getCompanyAi, getContact, listChatMessages, markRead, saveMessage } from "@/lib/chat";
import { json, preflight, sessionOrBearerUser } from "@/lib/ext-api";

// Chat: GET para leer (y sondear mensajes nuevos), POST para enviar.
// ?company=<slug>&with=<userId|ai>&after=<idDelÚltimoMensaje>
// Lo usan la app (cookie de sesión) y la extensión de Chrome (token Bearer, con CORS).

export const OPTIONS = preflight;

async function resolve(request: Request, params: URLSearchParams) {
  const user = await sessionOrBearerUser(request);
  if (!user) return { error: json({ error: "Sesión caducada" }, 401) };
  const company = await chatScope(user, params.get("company") ?? "");
  if (company === undefined) return { error: json({ error: "No autorizado" }, 403) };
  const withParam = params.get("with") ?? "";
  if (withParam === "ai") {
    if (!company) return { error: json({ error: "El asistente IA pertenece a una empresa." }, 400) };
    return { user, company, conversation: aiKey(company.id, user.userId), recipientId: null };
  }
  const contact = await getContact(user, company, Number(withParam));
  if (!contact) return { error: json({ error: "Contacto no válido" }, 404) };
  return { user, company, conversation: dmKey(user.userId, contact.user_id), recipientId: contact.user_id };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ctx = await resolve(request, params);
  if ("error" in ctx) return ctx.error;
  const messages = await listChatMessages(ctx.conversation, Number(params.get("after")) || 0);
  await markRead(messages, ctx.user.userId);
  return json({
    messages: messages.map((m) => ({ id: m.id, at: m.created_at, mine: m.role === "user" && m.sender_id === ctx.user.userId, ai: m.role === "assistant", content: m.content })),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const params = new URLSearchParams({ company: String(body.company ?? ""), with: String(body.with ?? "") });
  const ctx = await resolve(request, params);
  if ("error" in ctx) return ctx.error;
  const content = String(body.content ?? "").trim().slice(0, 4000);
  if (!content) return json({ error: "Escribe un mensaje." }, 400);

  await saveMessage({ conversation: ctx.conversation, company_id: ctx.company?.id ?? null, sender_id: ctx.user.userId, recipient_id: ctx.recipientId, role: "user", content });
  if (ctx.recipientId === null && ctx.company) {
    // Conversación con el agente IA: se responde en la misma petición.
    try {
      const ai = await getCompanyAi(ctx.company.id);
      if (!ai) throw new Error("El agente IA no está configurado en esta empresa.");
      const reply = await askAi(ai, ctx.company, ctx.user, await listChatMessages(ctx.conversation));
      await saveMessage({ conversation: ctx.conversation, company_id: ctx.company.id, sender_id: 0, recipient_id: ctx.user.userId, role: "assistant", content: reply });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "El agente IA no ha podido responder." }, 502);
    }
  }
  return json({ ok: true });
}
