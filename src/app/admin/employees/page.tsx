import { Suspense } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { AssignCompanyForm, CompanySelect, ToggleActiveForm } from "@/components/employee-controls";
import { Loading } from "@/components/loading";
import { btnPrimary, card, input, label, pageTitle } from "@/components/ui";
import { createEmployee } from "@/lib/actions";
import { listCompanies, listEmployees, listOpenEntries } from "@/lib/data";
import { requireAdmin } from "@/lib/session";

export default function EmployeesPage({ searchParams }: PageProps<"/admin/employees">) {
  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Empleados</h1>
      <Suspense fallback={<Loading />}>
        <Employees searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Employees({ searchParams }: Pick<PageProps<"/admin/employees">, "searchParams">) {
  await requireAdmin();
  const params = await searchParams;
  const filter = Number(params.company) || undefined;
  const [companies, employees, open] = await Promise.all([listCompanies(), listEmployees(filter), listOpenEntries()]);
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const working = new Set(open.map((e) => e.user_id));

  return (
    <>
      <section className={card}>
        <h2 className="mb-4 font-semibold text-slate-900">Nuevo empleado</h2>
        <ActionForm action={createEmployee} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
          <div>
            <label htmlFor="full_name" className={label}>Nombre completo</label>
            <input id="full_name" name="full_name" required className={input} />
          </div>
          <div>
            <label htmlFor="email" className={label}>Email</label>
            <input id="email" name="email" type="email" required className={input} />
          </div>
          <div>
            <label htmlFor="password" className={label}>Contraseña inicial</label>
            <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className={input} />
          </div>
          <div>
            <label htmlFor="hourly_rate" className={label}>Coste/hora (€)</label>
            <input id="hourly_rate" name="hourly_rate" type="number" min={0} step="0.01" placeholder="Opcional" className={input} />
          </div>
          <div>
            <label htmlFor="company_id" className={label}>Empresa</label>
            <CompanySelect companies={companies} defaultValue={filter} />
          </div>
          <button className={btnPrimary}>Crear empleado</button>
        </ActionForm>
      </section>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterChip href="/admin/employees" active={!filter}>Todas</FilterChip>
        {companies.map((c) => (
          <FilterChip key={c.id} href={`/admin/employees?company=${c.id}`} active={filter === c.id}>
            {c.name}
          </FilterChip>
        ))}
      </div>

      <section className={`${card} overflow-x-auto p-0!`}>
        {employees.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No hay empleados{filter ? " en esta empresa" : ""}.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Empleado</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr key={emp.id} className={emp.active ? "" : "opacity-60"}>
                  <td className="px-5 py-3">
                    <Link href={`/admin/employees/${emp.id}`} className="font-medium text-slate-900 hover:text-teal-700">
                      {emp.full_name || emp.email}
                    </Link>
                    <div className="text-slate-500">{emp.email}</div>
                  </td>
                  <td className="px-3 py-3">
                    {!emp.active ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Desactivado</span>
                    ) : working.has(emp.user_id) ? (
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">Trabajando</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Fuera</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <AssignCompanyForm profile={emp} companies={companies} />
                    {emp.company_id && !companyById.get(emp.company_id)?.active && (
                      <p className="mt-1 text-xs text-amber-700">La empresa está inactiva</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <ToggleActiveForm profile={emp} />
                      <Link href={`/admin/employees/${emp.id}`} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                        Ver horas →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 ${active ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}
    >
      {children}
    </Link>
  );
}
