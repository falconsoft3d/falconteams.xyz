"use client";

import { useState } from "react";
import { draftOfferDescriptionAction } from "@/lib/actions";
import { input, label } from "./ui";

/**
 * Descripción de la oferta con botón para que la IA la redacte (a partir del
 * título y los datos del formulario) o mejore el texto existente.
 */
export function OfferDescription({ id, companyId, defaultValue }: { id: string; companyId: number; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function draft(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const get = (name: string) => String(new FormData(form).get(name) ?? "");
    setBusy(true);
    setError(null);
    const res = await draftOfferDescriptionAction({
      companyId,
      title: get("title"),
      description: value,
      location: get("location"),
      modality: get("modality"),
      employment_type: get("employment_type"),
      salary: get("salary"),
    }).catch(() => ({ error: "No se pudo contactar con la IA.", text: undefined }));
    setBusy(false);
    if (res.text) setValue(res.text);
    else setError(res.error ?? "No se pudo generar la descripción.");
  }

  return (
    <div className="sm:col-span-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className={`${label} mb-0!`}>Descripción (funciones, requisitos, qué ofrecéis)</label>
        <button
          type="button"
          onClick={draft}
          disabled={busy}
          className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-60"
        >
          {busy ? "✨ Escribiendo…" : value.trim() ? "✨ Mejorar con IA" : "✨ Redactar con IA"}
        </button>
      </div>
      <textarea id={id} name="description" required rows={10} maxLength={8000} value={value} onChange={(e) => setValue(e.target.value)} className={input} />
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
