"use client";

import { useState, type ChangeEvent } from "react";

// Entradas de archivo que validan en el navegador antes de enviar: así nunca se
// supera el límite de las server actions (3 MB) con un error poco claro.

const FILE_CLASS =
  "block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100";

const kb = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`);

function setFiles(input: HTMLInputElement, files: File[]) {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  input.files = dt.files;
}

/** Reduce y comprime una imagen hasta que pese menos de maxBytes (WebP con transparencia; si no, JPEG). */
async function shrinkImage(file: File, maxBytes: number, maxSide: number) {
  const bitmap = await createImageBitmap(file);
  for (const side of [maxSide, Math.round(maxSide * 0.75), Math.round(maxSide * 0.5)]) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      let blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
      // Navegadores sin WebP devuelven PNG: se usa JPEG.
      if (!blob || blob.type !== "image/webp") blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (blob && blob.size <= maxBytes) {
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + `.${ext}`, { type: blob.type });
      }
    }
  }
  return null;
}

/**
 * Imagen PNG/JPG/WebP: si pesa más de maxBytes se optimiza en el navegador.
 * Con `multiple`, hasta maxFiles imágenes, cada una optimizada.
 */
export function ImageInput({ id, name, maxBytes, maxSide = 1600, required = false, multiple = false, maxFiles = 1 }: {
  id?: string;
  name: string;
  maxBytes: number;
  maxSide?: number;
  required?: boolean;
  multiple?: boolean;
  maxFiles?: number;
}) {
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = [...(input.files ?? [])];
    setNote(null);
    if (!files.length) return;
    if (files.length > maxFiles) {
      input.value = "";
      return setNote({ ok: false, text: `Elige como máximo ${maxFiles} imágenes.` });
    }
    if (files.some((f) => !/^image\/(png|jpeg|webp)$/.test(f.type))) {
      input.value = "";
      return setNote({ ok: false, text: "Las imágenes deben ser PNG, JPG o WebP." });
    }
    if (files.every((f) => f.size <= maxBytes)) return;
    setNote({ ok: true, text: "Optimizando…" });
    const result: File[] = [];
    for (const file of files) {
      const out = file.size <= maxBytes ? file : await shrinkImage(file, maxBytes, maxSide).catch(() => null);
      if (!out) {
        input.value = "";
        return setNote({ ok: false, text: `No se pudo reducir «${file.name}» por debajo de ${kb(maxBytes)}. Prueba con otra.` });
      }
      result.push(out);
    }
    setFiles(input, result);
    const before = files.reduce((s, f) => s + f.size, 0);
    const after = result.reduce((s, f) => s + f.size, 0);
    setNote({ ok: true, text: `Optimizada${result.length > 1 ? "s" : ""}: ${kb(before)} → ${kb(after)}` });
  }

  return (
    <>
      <input id={id} name={name} type="file" accept="image/png,image/jpeg,image/webp" required={required} multiple={multiple} onChange={onChange} className={FILE_CLASS} />
      {note && <p className={`mt-1 text-xs ${note.ok ? "text-teal-700" : "text-red-700"}`}>{note.text}</p>}
    </>
  );
}

/** Documentos: comprueba el tamaño de cada archivo (y del total) antes de enviar. */
export function SizedFileInput({ id, name, accept, multiple = false, required = false, maxBytes, maxTotal = 2.8 * 1024 * 1024 }: {
  id?: string;
  name: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  maxBytes: number;
  maxTotal?: number;
}) {
  const [error, setError] = useState<string | null>(null);
  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = [...(input.files ?? [])];
    const big = files.find((f) => f.size > maxBytes);
    const total = files.reduce((s, f) => s + f.size, 0);
    if (big) setError(`«${big.name}» pesa ${kb(big.size)}: el máximo es ${kb(maxBytes)} por archivo.`);
    else if (total > maxTotal) setError(`En total pesan ${kb(total)}: sube como máximo ${kb(maxTotal)} cada vez.`);
    else return setError(null);
    input.value = "";
  }
  return (
    <>
      <input id={id} name={name} type="file" accept={accept} multiple={multiple} required={required} onChange={onChange} className={FILE_CLASS} />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </>
  );
}
