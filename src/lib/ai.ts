import "server-only";
import { decrypt } from "./crypto";
import type { CompanyAi } from "./chat";

// Cliente mínimo de la API de chat de OpenAI (o compatible, con OPENAI_BASE_URL),
// usando la configuración de IA de cada empresa (token cifrado y modelo).

const BASE = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

export function aiReady(ai: CompanyAi | null): ai is CompanyAi & { api_key_enc: string } {
  return !!ai?.enabled && !!ai.api_key_enc;
}

/** Devuelve el texto de la respuesta. Con json: true, pide y valida un objeto JSON. */
export async function aiComplete(ai: CompanyAi, messages: AiMessage[], opts: { json?: boolean; timeoutMs?: number } = {}) {
  if (!aiReady(ai)) throw new Error("El agente IA no está activado en esta empresa.");
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${decrypt(ai.api_key_enc)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: ai.model, messages, ...(opts.json && { response_format: { type: "json_object" } }) }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60000),
  }).catch(() => null);
  if (!res) throw new Error("No se pudo contactar con OpenAI.");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenAI: ${body.error?.message ?? `error ${res.status}`}`);
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("OpenAI no ha devuelto respuesta.");
  return content.trim();
}

/** Igual que aiComplete, pero devuelve el JSON ya interpretado. */
export async function aiJson<T>(ai: CompanyAi, messages: AiMessage[], timeoutMs?: number): Promise<T> {
  const text = await aiComplete(ai, messages, { json: true, timeoutMs });
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")) as T;
  } catch {
    throw new Error("La IA devolvió una respuesta con formato no válido.");
  }
}
