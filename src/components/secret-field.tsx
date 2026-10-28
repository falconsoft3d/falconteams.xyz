"use client";

import { useState } from "react";
import { revealLinkPassword } from "@/lib/actions";

const btn = "rounded-md px-2 py-0.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50";

async function copy(text: string, done: () => void) {
  await navigator.clipboard.writeText(text);
  done();
}

/** Texto con botón de copiar (usuario). */
export function CopyText({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1">
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-800">{value}</code>
      <button type="button" className={btn} onClick={() => copy(value, () => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </span>
  );
}

/** Contraseña oculta: se pide al servidor solo al pulsar Mostrar o Copiar. */
export function SecretField({ linkId }: { linkId: number }) {
  const [password, setPassword] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (password !== null) return password;
    setBusy(true);
    const res = await revealLinkPassword(linkId);
    setBusy(false);
    if (res.error || res.password === undefined) {
      setStatus(res.error ?? "No disponible.");
      return null;
    }
    setPassword(res.password);
    return res.password;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-800">{visible && password !== null ? password : "••••••••"}</code>
      <button type="button" disabled={busy} className={btn} onClick={async () => { if (visible) setVisible(false); else if ((await load()) !== null) setVisible(true); }}>
        {visible ? "Ocultar" : "Mostrar"}
      </button>
      <button type="button" disabled={busy} className={btn} onClick={async () => { const p = await load(); if (p !== null) copy(p, () => { setStatus("¡Copiada!"); setTimeout(() => setStatus(null), 1500); }); }}>
        Copiar
      </button>
      {status && <span className="text-xs text-slate-500">{status}</span>}
    </span>
  );
}
