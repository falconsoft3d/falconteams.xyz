"use client";

import { useState } from "react";
import { label } from "./ui";

const TEMPLATES = [
  { value: "classic", name: "Clásico", text: "Título en color y tabla con línea de acento." },
  { value: "modern", name: "Moderno", text: "Cabecera de color con el logo y total destacado." },
  { value: "minimal", name: "Minimalista", text: "Sobrio, mucho espacio en blanco y líneas finas." },
] as const;

/** Miniatura esquemática de cada diseño con el color elegido. */
function Preview({ template, accent }: { template: string; accent: string }) {
  const line = (w: string, c = "#cbd5e1") => <div className="h-1 rounded" style={{ width: w, backgroundColor: c }} />;
  return (
    <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-2 text-[0]">
      {template === "modern" ? (
        <div className="-m-2 mb-2 flex items-center justify-between p-2" style={{ backgroundColor: accent }}>
          <div className="size-3 rounded-sm bg-white" />
          {line("35%", "#ffffff")}
        </div>
      ) : (
        <div className="mb-2 flex items-center justify-between">
          <div className="size-3 rounded-sm bg-slate-300" />
          {line("35%", template === "classic" ? accent : "#94a3b8")}
        </div>
      )}
      <div className="mb-2 grid grid-cols-2 gap-1">
        <div className="space-y-0.5">{line("80%")}{line("60%")}</div>
        <div className="space-y-0.5">{line("70%")}</div>
      </div>
      <div className="mb-1 h-1.5 rounded" style={{ backgroundColor: template === "modern" ? accent : template === "classic" ? accent : "#e2e8f0" }} />
      <div className="space-y-1">{line("100%", "#e2e8f0")}{line("100%", "#e2e8f0")}{line("100%", "#e2e8f0")}</div>
      <div className="mt-2 flex justify-end">
        <div className="h-2 w-1/3 rounded" style={{ backgroundColor: template === "modern" ? accent : "#94a3b8" }} />
      </div>
    </div>
  );
}

/** Diseño de factura (3 opciones) y color de acento, dentro del formulario de facturación. */
export function InvoiceTemplatePicker({ template, accent }: { template: string | null; accent: string | null }) {
  const [selected, setSelected] = useState(template ?? "classic");
  const [color, setColor] = useState(accent ?? "#0f766e");
  return (
    <fieldset className="sm:col-span-2">
      <legend className={label}>Diseño de la factura</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {TEMPLATES.map((t) => (
          <label
            key={t.value}
            className={`cursor-pointer rounded-xl border-2 p-3 transition ${selected === t.value ? "border-teal-600 bg-teal-50/50" : "border-slate-200 hover:border-slate-300"}`}
          >
            <input type="radio" name="invoice_template" value={t.value} checked={selected === t.value} onChange={() => setSelected(t.value)} className="sr-only" />
            <Preview template={t.value} accent={color} />
            <p className="mt-2 text-sm font-semibold text-slate-900">{t.name}</p>
            <p className="text-xs text-slate-500">{t.text}</p>
          </label>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-3 text-sm text-slate-700">
        <input type="color" name="accent_color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
        Color de acento <code className="text-xs text-slate-500">{color}</code>
      </label>
    </fieldset>
  );
}
