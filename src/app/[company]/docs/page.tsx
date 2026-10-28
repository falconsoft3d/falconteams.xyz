import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { FileIcon, FolderIcon } from "@/components/doc-icons";
import { DocsDropZone, DraggableFile, DropFolder } from "@/components/docs-dnd";
import { EmployeeShell } from "@/components/employee-shell";
import { SizedFileInput } from "@/components/file-inputs";
import { Loading } from "@/components/loading";
import { btnDanger, btnPrimary, btnSmall, card, input, pageTitle } from "@/components/ui";
import { createFolder, removeDocFile, removeDocFolder, setFolderColor, uploadDocs } from "@/lib/actions";
import { FOLDER_COLORS, listDocFiles, listDocFolders, type DocFolder } from "@/lib/data";
import { requireCompanyMember } from "@/lib/session";
import { formatDate } from "@/lib/time";

export default function DocsPage(props: PageProps<"/[company]/docs">) {
  return (
    <Suspense fallback={<Loading />}>
      <Docs {...props} />
    </Suspense>
  );
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Selector de color de carpeta (botones de radio con muestras). */
function ColorSwatches({ name = "color", selected }: { name?: string; selected?: string | null }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FOLDER_COLORS.map((c, i) => (
        <label key={c} className="cursor-pointer" title={c}>
          <input type="radio" name={name} value={c} defaultChecked={selected ? selected === c : i === 0} className="peer sr-only" />
          <span className="block size-6 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-900" style={{ backgroundColor: c }} />
        </label>
      ))}
    </div>
  );
}

async function Docs({ params, searchParams }: PageProps<"/[company]/docs">) {
  const [{ company: slug }, query] = await Promise.all([params, searchParams]);
  const { user, company, isAdmin } = await requireCompanyMember(slug);
  const folderId = Number(query.folder) || null;

  const folders = await listDocFolders(company.id);
  const current = folderId ? folders.find((f) => f.id === folderId) : null;
  if (folderId && !current) notFound();
  const files = await listDocFiles(company.id, folderId);
  const children = folders.filter((f) => f.parent_id === folderId);

  // Ruta de carpetas desde la raíz hasta la actual.
  const byId = new Map(folders.map((f) => [f.id, f]));
  const trail: DocFolder[] = [];
  for (let f = current; f; f = f.parent_id ? byId.get(f.parent_id) : undefined) trail.unshift(f);
  const href = (id: number | null) => `/${slug}/docs${id ? `?folder=${id}` : ""}`;
  const hidden = (
    <>
      <input type="hidden" name="company_id" value={company.id} />
      {folderId && <input type="hidden" name="folder_id" value={folderId} />}
    </>
  );
  const empty = children.length === 0 && files.length === 0;

  // Solo el admin sube, mueve y organiza; los empleados navegan y descargan.
  const folderRow = (f: DocFolder) => (
    <div className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
      <Link href={href(f.id)} className="flex flex-1 items-center gap-3 font-medium text-slate-900">
        <FolderIcon color={f.color} />
        {f.name}
      </Link>
      {isAdmin && (
        <div className="flex items-center gap-2">
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
              <span className="size-3 rounded-full" style={{ backgroundColor: f.color ?? FOLDER_COLORS[0] }} /> Color
            </summary>
            <ActionForm action={setFolderColor} showOk={false} className="absolute right-0 z-20 mt-1 w-52 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <input type="hidden" name="company_id" value={company.id} />
              <input type="hidden" name="target_folder" value={f.id} />
              <ColorSwatches selected={f.color} />
              <button className={`${btnPrimary} ${btnSmall} w-full`}>Aplicar</button>
            </ActionForm>
          </details>
          <ActionForm action={removeDocFolder} showOk={false} className="flex items-center gap-2">
            <input type="hidden" name="company_id" value={company.id} />
            <input type="hidden" name="folder_id" value={f.id} />
            <button className={`${btnDanger} ${btnSmall}`}>Eliminar</button>
          </ActionForm>
        </div>
      )}
    </div>
  );

  const list = (
    <section className={`${card} p-0!`}>
      {empty && !current ? (
        <p className="p-8 text-center text-sm text-slate-500">
          {isAdmin ? "Arrastra ficheros aquí para subirlos, o usa los botones de arriba." : "Esta carpeta está vacía."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {current && (
            <li>
              {isAdmin ? (
                <DropFolder companyId={company.id} folderId={current.parent_id}>
                  <Link href={href(current.parent_id)} className="flex items-center gap-3 px-5 py-3 text-sm text-slate-600 hover:bg-slate-50">⬑ Subir un nivel</Link>
                </DropFolder>
              ) : (
                <Link href={href(current.parent_id)} className="flex items-center gap-3 px-5 py-3 text-sm text-slate-600 hover:bg-slate-50">⬑ Subir un nivel</Link>
              )}
            </li>
          )}
          {children.map((f) => (
            <li key={`d${f.id}`}>
              {isAdmin ? <DropFolder companyId={company.id} folderId={f.id}>{folderRow(f)}</DropFolder> : folderRow(f)}
            </li>
          ))}
          {files.map((f) => {
            const row = (
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                <a href={`/api/docs/${f.id}`} draggable={false} className="flex min-w-0 flex-1 items-center gap-3 text-slate-900 hover:text-teal-700">
                  <FileIcon type={f.type} />
                  <span className="truncate">{f.name}</span>
                </a>
                <span className="text-xs text-slate-500">{formatSize(f.size)} · {formatDate(f.created_at)}</span>
                {isAdmin && (
                  <ActionForm action={removeDocFile} showOk={false}>
                    <input type="hidden" name="file_id" value={f.id} />
                    <button className={`${btnDanger} ${btnSmall}`}>Eliminar</button>
                  </ActionForm>
                )}
              </div>
            );
            return <li key={`f${f.id}`}>{isAdmin ? <DraggableFile fileId={f.id}>{row}</DraggableFile> : row}</li>;
          })}
          {empty && current && <li className="px-5 py-6 text-center text-sm text-slate-500">Carpeta vacía.{isAdmin && " Arrastra ficheros aquí para subirlos."}</li>}
        </ul>
      )}
    </section>
  );

  return (
    <EmployeeShell user={user} company={company}>
      <div>
        <h1 className={pageTitle}>Documentación</h1>
        <nav className="mt-2 flex flex-wrap items-center gap-1 text-sm" aria-label="Ruta de carpetas">
          <Link href={href(null)} className="flex items-center gap-1.5 text-teal-700 hover:underline">
            <FolderIcon className="size-4" /> {company.name}
          </Link>
          {trail.map((f) => (
            <span key={f.id} className="flex items-center gap-1">
              <span className="text-slate-400">/</span>
              <Link href={href(f.id)} className="flex items-center gap-1.5 text-teal-700 hover:underline">
                <FolderIcon color={f.color} className="size-4" /> {f.name}
              </Link>
            </span>
          ))}
        </nav>
      </div>

      {isAdmin && (
        <section className={`${card} grid gap-4 md:grid-cols-2`}>
          <ActionForm action={uploadDocs} className="flex flex-wrap items-center gap-2">
            {hidden}
            <div className="min-w-0 flex-1">
              <SizedFileInput name="files" multiple required maxBytes={2 * 1024 * 1024} />
            </div>
            <button className={`${btnPrimary} ${btnSmall}`}>Subir</button>
            <p className="basis-full text-xs text-slate-500">Hasta 2 MB por fichero. También puedes arrastrarlos a la lista o sobre una carpeta.</p>
          </ActionForm>
          <ActionForm action={createFolder} className="space-y-2">
            {hidden}
            <div className="flex flex-wrap items-center gap-2">
              <input name="name" required maxLength={120} placeholder="Nueva carpeta" aria-label="Nombre de la carpeta" className={`${input} min-w-0 flex-1`} />
              <button className={`${btnPrimary} ${btnSmall}`}>Crear carpeta</button>
            </div>
            <ColorSwatches />
          </ActionForm>
        </section>
      )}

      {isAdmin ? (
        <DocsDropZone companyId={company.id} folderId={folderId}>
          {list}
        </DocsDropZone>
      ) : (
        list
      )}
      {isAdmin && <p className="text-xs text-slate-500">Consejo: arrastra un fichero de la lista sobre una carpeta (o sobre «Subir un nivel») para moverlo.</p>}
    </EmployeeShell>
  );
}
