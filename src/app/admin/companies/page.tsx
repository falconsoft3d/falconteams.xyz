import { Suspense } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Loading } from "@/components/loading";
import { btnDanger, btnPrimary, btnSecondary, btnSmall, card, input, label, pageTitle } from "@/components/ui";
import { createCompany, deleteCompany, renameCompany, setAutoClose, setCompanyActive } from "@/lib/actions";
import { AiSettingsForm } from "@/components/ai-settings-form";
import { listCompanyAi } from "@/lib/chat";
import { listCompanies, listEmployees } from "@/lib/data";
import { requireAdmin } from "@/lib/session";

export default function CompaniesPage() {
  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Empresas</h1>
      <section className={card}>
        <h2 className="mb-4 font-semibold text-slate-900">Nueva empresa</h2>
        <ActionForm action={createCompany} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label htmlFor="name" className={label}>Nombre</label>
            <input id="name" name="name" required placeholder="Acme S.L." className={input} />
          </div>
          <div className="min-w-48 flex-1">
            <label htmlFor="slug" className={label}>Dirección (opcional)</label>
            <input id="slug" name="slug" placeholder="acme → /acme/login" className={input} />
          </div>
          <button className={btnPrimary}>Crear empresa</button>
        </ActionForm>
      </section>
      <Suspense fallback={<Loading />}>
        <CompanyList />
      </Suspense>
    </div>
  );
}

async function CompanyList() {
  await requireAdmin();
  const [companies, employees, aiByCompany] = await Promise.all([listCompanies(), listEmployees(), listCompanyAi()]);
  if (companies.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay empresas.</p>;
  }
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {companies.map((c) => (
        <article key={c.id} className={card}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{c.name}</h3>
              <p className="text-sm text-slate-500">
                Login de empleados: <Link href={`/${c.slug}/login`} className="font-mono text-teal-700 hover:underline">/{c.slug}/login</Link>
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
              {c.active ? "Activa" : "Inactiva"}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            <Link href={`/admin/employees?company=${c.id}`} className="hover:text-teal-700">
              {employees.filter((e) => e.company_id === c.id).length} empleados
            </Link>
            {" · "}
            <Link href={`/${c.slug}`} className="text-teal-700 hover:underline">Abrir dashboard →</Link>
          </p>
          <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-slate-100 pt-4">
            <ActionForm action={renameCompany} showOk={false} className="flex flex-1 flex-wrap gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input name="name" defaultValue={c.name} aria-label="Nombre" required className={`${input} min-w-32 flex-1 py-1.5!`} />
              <button className={`${btnSecondary} ${btnSmall}`}>Renombrar</button>
            </ActionForm>
            <ActionForm action={setCompanyActive} showOk={false}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="active" value={String(!c.active)} />
              <button className={`${btnSecondary} ${btnSmall}`}>{c.active ? "Desactivar" : "Activar"}</button>
            </ActionForm>
          </div>
          <ActionForm action={setAutoClose} className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
            <input type="hidden" name="id" value={c.id} />
            <label className="flex items-center gap-2 font-medium text-slate-700">
              <input type="checkbox" name="auto_close" defaultChecked={c.auto_close} className="size-4 accent-teal-700" />
              Autocierre
            </label>
            <label className="flex items-center gap-1.5 text-slate-600">
              tras
              <input
                type="number"
                name="auto_close_hours"
                min={1}
                max={24}
                defaultValue={c.auto_close_hours ?? 8}
                className={`${input} w-16! px-2! py-1!`}
              />
              h sin fichar salida
            </label>
            <button className={`${btnSecondary} ${btnSmall} ml-auto`}>Guardar</button>
          </ActionForm>
          <details className="mt-3 rounded-xl border border-slate-200 px-3 py-2.5" open={false}>
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-medium text-slate-700">
              🤖 Agente IA del chat
              {aiByCompany.get(c.id)?.enabled && aiByCompany.get(c.id)?.api_key_enc ? (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">Activado · {aiByCompany.get(c.id)!.model}</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Desactivado</span>
              )}
            </summary>
            <div className="mt-3">
              <AiSettingsForm company={c} ai={aiByCompany.get(c.id) ?? null} />
            </div>
          </details>
          <details className="mt-3 rounded-xl border border-red-100 px-3 py-2.5">
            <summary className="cursor-pointer text-sm font-medium text-red-700">Eliminar empresa</summary>
            <p className="mt-2 text-sm text-slate-600">
              Se borran para siempre sus fichajes, proyectos, documentos, enlaces, chat, correo interno, ofertas y equipos.
              Antes hay que mover sus empleados a otra empresa.
            </p>
            <ActionForm action={deleteCompany} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input
                name="confirm"
                required
                autoComplete="off"
                placeholder={c.slug}
                aria-label={`Escribe ${c.slug} para confirmar`}
                className={`${input} min-w-32 flex-1 py-1.5!`}
              />
              <button className={`${btnDanger} ${btnSmall}`}>Eliminar definitivamente</button>
            </ActionForm>
          </details>
        </article>
      ))}
    </section>
  );
}
