"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Avatar } from "./avatar";
import { ChatWindow } from "./chat-window";

type Contact = { id: number; name: string; role: string; avatarUrl: string | null; unread: number };
type Peer = { key: string; name: string; isAi: boolean; avatarUrl: string | null; minimized: boolean };

const MAX_WINDOWS = 3;

/**
 * Chat flotante al estilo Facebook: botón abajo a la derecha con los no leídos,
 * lista de contactos y ventanas de conversación acopladas abajo.
 */
export function ChatDock({ company }: { company: string }) {
  const pathname = usePathname();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [ai, setAi] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [windows, setWindows] = useState<Peer[]>([]);

  // Contactos y no leídos: cada 10 s (las conversaciones abiertas sondean por su cuenta).
  useEffect(() => {
    let active = true;
    const load = async () => {
      const res = await fetch(`/api/chat/contacts?company=${encodeURIComponent(company)}`, { cache: "no-store" }).catch(() => null);
      if (!active || !res?.ok) return;
      const body = await res.json();
      setContacts(body.contacts);
      setAi(body.ai);
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [company]);

  // En la página de chat completa no hace falta el flotante.
  if (pathname.endsWith("/chat")) return null;

  const unread = contacts.reduce((s, c) => s + c.unread, 0);
  const open = (peer: Omit<Peer, "minimized">) => {
    setListOpen(false);
    setWindows((ws) => {
      const rest = ws.filter((w) => w.key !== peer.key);
      return [{ ...peer, minimized: false }, ...rest].slice(0, MAX_WINDOWS);
    });
    // Al abrirla se marcan como leídos: se refleja ya en el contador.
    setContacts((cs) => cs.map((c) => (String(c.id) === peer.key ? { ...c, unread: 0 } : c)));
  };
  const toggle = (key: string) => setWindows((ws) => ws.map((w) => (w.key === key ? { ...w, minimized: !w.minimized } : w)));
  const close = (key: string) => setWindows((ws) => ws.filter((w) => w.key !== key));

  return (
    <div className="pointer-events-none fixed bottom-0 right-4 z-40 flex items-end gap-3 print:hidden">
      {windows.map((w, i) => (
        // En móvil solo cabe una ventana, casi a todo el ancho (junto al botón).
        <section
          key={w.key}
          className={`pointer-events-auto w-[calc(100vw-6rem)] overflow-hidden rounded-t-xl border border-b-0 border-slate-200 bg-white shadow-2xl sm:w-80 ${i > 0 ? "hidden sm:block" : ""}`}
        >
          <header className="flex items-center gap-2 bg-teal-700 px-3 py-2 text-white">
            <button type="button" onClick={() => toggle(w.key)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              {w.isAi ? <span className="flex size-7 items-center justify-center rounded-full bg-white/20">🤖</span> : <Avatar name={w.name} url={w.avatarUrl} size="size-7" />}
              <span className="truncate text-sm font-semibold">{w.name}</span>
            </button>
            <button type="button" onClick={() => toggle(w.key)} className="rounded px-1.5 text-lg leading-none hover:bg-white/20" aria-label={w.minimized ? "Abrir" : "Minimizar"}>
              {w.minimized ? "▴" : "–"}
            </button>
            <button type="button" onClick={() => close(w.key)} className="rounded px-1.5 text-lg leading-none hover:bg-white/20" aria-label="Cerrar">
              ×
            </button>
          </header>
          {!w.minimized && <ChatWindow company={company} peer={w.key} peerName={w.name} isAi={w.isAi} compact />}
        </section>
      ))}

      <div className="pointer-events-auto relative mb-4">
        {listOpen && (
          <div className="absolute bottom-16 right-0 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <p className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">Chat</p>
            <ul className="max-h-96 overflow-y-auto py-1">
              {ai && (
                <li>
                  <button type="button" onClick={() => open({ key: "ai", name: "Asistente IA", isAi: true, avatarUrl: null })} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50">
                    <span className="flex size-8 items-center justify-center rounded-full bg-violet-100">🤖</span>
                    <span className="font-medium text-slate-900">Asistente IA</span>
                  </button>
                </li>
              )}
              {contacts.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => open({ key: String(c.id), name: c.name, isAi: false, avatarUrl: c.avatarUrl })}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <Avatar name={c.name} url={c.avatarUrl} />
                    <span className={`min-w-0 flex-1 truncate ${c.unread ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                      {c.name}
                      {c.role === "admin" && <span className="ml-1 text-xs font-normal text-slate-500">(admin)</span>}
                    </span>
                    {c.unread > 0 && <span className="rounded-full bg-rose-600 px-1.5 text-xs font-semibold text-white">{c.unread}</span>}
                  </button>
                </li>
              ))}
              {!ai && contacts.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No hay nadie con quien hablar todavía.</li>}
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={() => setListOpen((v) => !v)}
          aria-label="Chat"
          aria-expanded={listOpen}
          className="relative flex size-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-xl transition hover:scale-105 hover:bg-teal-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-6" aria-hidden>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-bold text-white ring-2 ring-white">
              {unread}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
