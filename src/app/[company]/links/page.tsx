import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { EmployeeShell } from "@/components/employee-shell";
import { Loading } from "@/components/loading";
import { CopyText, SecretField } from "@/components/secret-field";
import { btnDanger, btnPrimary, btnSecondary, btnSmall, card, input, label, pageTitle } from "@/components/ui";
import { removeCompanyLink, saveCompanyLink } from "@/lib/actions";
import { listCompanyLinks, type CompanyLink } from "@/lib/data";
import { requireCompanyMember } from "@/lib/session";

export default function LinksPage(props: PageProps<"/[company]/links">) {
  return (
    <Suspense fallback={<Loading />}>
      <Links {...props} />
    </Suspense>
  );
}

async function Links({ params }: PageProps<"/[company]/links">) {
  const { company: slug } = await params;
  const { user, company, isAdmin } = await requireCompanyMember(slug);
  const links = await listCompanyLinks(company.id);

  return (
    <EmployeeShell user={user} company={company}>
      <div>
        <h1 className={pageTitle}>Enlaces</h1>
        <p className="mt-1 text-slate-500">Accesos a las herramientas de {company.name}.</p>
      </div>

      {isAdmin && (
        <section className={card}>
          <h2 className="mb-3 font-semibold text-slate-900">Añadir enlace</h2>
          <LinkForm companyId={company.id} />
        </section>
      )}

      {links.length === 0 ? (
        <p className={`${card} text-sm text-slate-500`}>Todavía no hay enlaces.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {links.map((link) => (
            <article key={link.id} className={card}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{link.title}</h3>
                <a href={link.url} target="_blank" rel="noreferrer" className={`${btnPrimary} ${btnSmall}`}>Abrir ↗</a>
              </div>
              <p className="mt-1 break-all text-sm text-slate-500">{link.url}</p>
              <dl className="mt-3 space-y-1.5 text-sm">
                {link.username && (
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="w-20 text-slate-500">Usuario</dt>
                    <dd><CopyText value={link.username} /></dd>
                  </div>
                )}
                {link.password_enc && (
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="w-20 text-slate-500">Contraseña</dt>
                    <dd><SecretField linkId={link.id} /></dd>
                  </div>
                )}
              </dl>
              {link.notes && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{link.notes}</p>}
              {isAdmin && (
                <details className="mt-3 border-t border-slate-100 pt-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-600">Editar</summary>
                  <div className="mt-3">
                    <LinkForm companyId={company.id} link={link} />
                  </div>
                  <ActionForm action={removeCompanyLink} showOk={false} className="mt-2">
                    <input type="hidden" name="link_id" value={link.id} />
                    <button className={`${btnDanger} ${btnSmall}`}>Eliminar enlace</button>
                  </ActionForm>
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </EmployeeShell>
  );
}

function LinkForm({ companyId, link }: { companyId: number; link?: CompanyLink }) {
  const id = link?.id ?? "new";
  return (
    <ActionForm action={saveCompanyLink} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="company_id" value={companyId} />
      {link && <input type="hidden" name="link_id" value={link.id} />}
      <div>
        <label htmlFor={`title-${id}`} className={label}>Nombre</label>
        <input id={`title-${id}`} name="title" required defaultValue={link?.title} placeholder="Odoo producción" className={input} />
      </div>
      <div>
        <label htmlFor={`url-${id}`} className={label}>URL</label>
        <input id={`url-${id}`} name="url" type="url" required defaultValue={link?.url} placeholder="https://" className={input} />
      </div>
      <div>
        <label htmlFor={`user-${id}`} className={label}>Usuario</label>
        <input id={`user-${id}`} name="username" defaultValue={link?.username ?? ""} autoComplete="off" className={input} />
      </div>
      <div>
        <label htmlFor={`pass-${id}`} className={label}>Contraseña {link?.password_enc && <span className="font-normal text-slate-500">(vacía = no cambiar)</span>}</label>
        <input id={`pass-${id}`} name="password" type="password" autoComplete="new-password" className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`notes-${id}`} className={label}>Notas</label>
        <textarea id={`notes-${id}`} name="notes" rows={2} defaultValue={link?.notes ?? ""} className={input} />
      </div>
      <div className="sm:col-span-2">
        <button className={`${link ? btnSecondary : btnPrimary} ${btnSmall}`}>{link ? "Guardar cambios" : "Añadir enlace"}</button>
      </div>
    </ActionForm>
  );
}
