"use client";

import { useEffect, useRef, useState } from "react";

type Message = { id: number; at: string; mine: boolean; ai: boolean; content: string };

/**
 * Conversación con sondeo cada 3 s de mensajes nuevos (no hay tiempo real en la
 * base de datos). Se monta con key por conversación, así que empieza vacía.
 */
export function ChatWindow({ company, peer, peerName, isAi, compact = false }: {
  company: string;
  peer: string;
  peerName: string;
  isAi: boolean;
  /** Versión reducida para las ventanas del chat flotante. */
  compact?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastId = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const res = await fetch(`/api/chat?company=${encodeURIComponent(company)}&with=${peer}&after=${lastId.current}`, { cache: "no-store" }).catch(() => null);
      if (!active || !res?.ok) return;
      const { messages: fresh } = (await res.json()) as { messages: Message[] };
      if (fresh.length) {
        lastId.current = fresh[fresh.length - 1].id;
        setMessages((prev) => (prev.length && prev[0].id <= fresh[0].id ? [...prev, ...fresh.filter((m) => m.id > prev[prev.length - 1].id)] : fresh));
      }
    };
    load();
    const id = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [company, peer]);

  useEffect(() => {
    // Sin devolver nada: en Chrome reciente scrollIntoView() devuelve una promesa.
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, sending]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, with: peer, content }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) setError(body.error ?? "No se pudo enviar.");
    else setText("");
    // Trae lo nuevo (y la respuesta del agente) sin esperar al siguiente sondeo.
    const fresh = await fetch(`/api/chat?company=${encodeURIComponent(company)}&with=${peer}&after=${lastId.current}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (fresh?.messages?.length) {
      lastId.current = fresh.messages[fresh.messages.length - 1].id;
      setMessages((prev) => [...prev, ...fresh.messages.filter((m: Message) => !prev.some((p) => p.id === m.id))]);
    }
    setSending(false);
  }

  const time = (at: string) => new Date(at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex flex-col ${compact ? "h-80" : "h-[70vh]"}`}>
      <div className={`flex-1 space-y-2 overflow-y-auto ${compact ? "p-3" : "p-4"}`}>
        {messages.length === 0 && <p className="text-center text-sm text-slate-500">{isAi ? `Pregunta lo que quieras a ${peerName}.` : `Escribe el primer mensaje a ${peerName}.`}</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? "rounded-br-sm bg-teal-700 text-white" : m.ai ? "rounded-bl-sm bg-violet-50 text-slate-900" : "rounded-bl-sm bg-slate-100 text-slate-900"}`}>
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <p className={`mt-1 text-[10px] ${m.mine ? "text-teal-100" : "text-slate-400"}`}>{time(m.at)}</p>
            </div>
          </div>
        ))}
        {sending && isAi && <p className="text-sm text-slate-500">🤖 Pensando…</p>}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          placeholder={compact ? "Escribe un mensaje…" : "Escribe un mensaje… (Intro para enviar, Mayús+Intro para salto de línea)"}
          className="min-h-10 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
        />
        <button disabled={sending || !text.trim()} className="rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
          Enviar
        </button>
      </form>
      {error && <p className="px-3 pb-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
