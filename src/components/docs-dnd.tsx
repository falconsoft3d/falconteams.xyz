"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { moveDocFile, uploadDocs } from "@/lib/actions";

// Arrastrar y soltar en la documentación (solo admin):
//   - ficheros del ordenador sobre la página → se suben a la carpeta actual,
//   - sobre una carpeta → se suben dentro de esa carpeta,
//   - un fichero de la lista sobre una carpeta → se mueve allí.

const DOC_TYPE = "application/x-ft-doc";
const MAX_BYTES = 2 * 1024 * 1024;

const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");
const hasDoc = (e: DragEvent) => e.dataTransfer.types.includes(DOC_TYPE);

/** Sube los ficheros de uno en uno (así nunca se supera el límite por envío). */
async function uploadAll(companyId: number, folderId: number | null, files: File[], onProgress: (text: string) => void) {
  const errors: string[] = [];
  let done = 0;
  for (const file of files) {
    onProgress(`Subiendo ${done + 1} de ${files.length}: ${file.name}`);
    if (file.size > MAX_BYTES) {
      errors.push(`«${file.name}» pesa más de 2 MB`);
      continue;
    }
    const fd = new FormData();
    fd.set("company_id", String(companyId));
    if (folderId) fd.set("folder_id", String(folderId));
    fd.append("files", file);
    const res = await uploadDocs(undefined, fd).catch(() => ({ error: `No se pudo subir «${file.name}»` }));
    if (res?.error) errors.push(res.error);
    else done++;
  }
  return { done, errors };
}

function useUploader(companyId: number) {
  const router = useRouter();
  const [status, setStatus] = useState<{ busy: boolean; text: string; error?: boolean } | null>(null);
  const upload = async (folderId: number | null, files: File[]) => {
    if (!files.length) return;
    setStatus({ busy: true, text: "Preparando…" });
    const { done, errors } = await uploadAll(companyId, folderId, files, (text) => setStatus({ busy: true, text }));
    router.refresh();
    setStatus(errors.length ? { busy: false, text: `${done} subido(s). ${errors.join(" · ")}`, error: true } : { busy: false, text: `✓ ${done} fichero(s) subido(s).` });
  };
  const move = async (fileId: number, folderId: number | null) => {
    setStatus({ busy: true, text: "Moviendo…" });
    const res = await moveDocFile(fileId, folderId).catch(() => ({ error: "No se pudo mover el fichero." }));
    router.refresh();
    setStatus(res.error ? { busy: false, text: res.error, error: true } : null);
  };
  return { status, upload, move };
}

/** Zona que recibe ficheros del ordenador para subirlos a la carpeta actual. */
export function DocsDropZone({ companyId, folderId, children }: { companyId: number; folderId: number | null; children: ReactNode }) {
  const { status, upload } = useUploader(companyId);
  const [over, setOver] = useState(false);
  return (
    <div
      className="relative"
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setOver(false);
        upload(folderId, [...e.dataTransfer.files]);
      }}
    >
      {children}
      {over && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-teal-500 bg-teal-50/80 text-sm font-semibold text-teal-800">
          Suelta los ficheros para subirlos aquí
        </div>
      )}
      {status && (
        <p role="status" className={`mt-2 text-sm ${status.error ? "text-red-700" : "text-teal-700"}`}>
          {status.busy && <span className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-teal-300 border-t-teal-700 align-middle" />}
          {status.text}
        </p>
      )}
    </div>
  );
}

/** Carpeta que acepta ficheros del ordenador (se suben dentro) o de la lista (se mueven). */
export function DropFolder({ companyId, folderId, children, className = "" }: { companyId: number; folderId: number | null; children: ReactNode; className?: string }) {
  const { status, upload, move } = useUploader(companyId);
  const [over, setOver] = useState(false);
  return (
    <div
      className={`${className} ${over ? "bg-teal-50 ring-2 ring-inset ring-teal-500" : ""}`}
      onDragOver={(e) => {
        if (!hasFiles(e) && !hasDoc(e)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = hasDoc(e) ? "move" : "copy";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const docId = Number(e.dataTransfer.getData(DOC_TYPE));
        if (docId) move(docId, folderId);
        else if (e.dataTransfer.files.length) upload(folderId, [...e.dataTransfer.files]);
      }}
    >
      {children}
      {status && <p className={`px-5 pb-2 text-xs ${status.error ? "text-red-700" : "text-teal-700"}`}>{status.text}</p>}
    </div>
  );
}

/** Fichero de la lista que se puede arrastrar a una carpeta. */
export function DraggableFile({ fileId, children, className = "" }: { fileId: number; children: ReactNode; className?: string }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DOC_TYPE, String(fileId));
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`${className} cursor-grab active:cursor-grabbing ${dragging ? "opacity-40" : ""}`}
    >
      {children}
    </div>
  );
}
