import { Suspense } from "react";
import Link from "next/link";
import { Loading } from "@/components/loading";
import { Stat } from "@/components/stat";
import { card, pageTitle } from "@/components/ui";
import {
  generatesInvoice,
  listBillingProfilesWithoutLogo,
  listCompanies,
  listEmployees,
  listInvoiceItems,
  listMonthEntries,
  listUsersWithLogo,
  missingBillingFields,
} from "@/lib/data";
import { invoiceTotals } from "@/lib/invoice";
import { formatMoney } from "@/lib/money";
import { requestNow } from "@/lib/now";
import { requireAdmin } from "@/lib/session";
import { monthLabel, monthParam, parseMonth, shiftMonth } from "@/lib/time";

export default function InvoicesPage(props: PageProps<"/admin/invoices">) {
  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Facturas</h1>
      <Suspense fallback={<Loading />}>
        <Invoices {...props} />
      </Suspense>
    </div>
  );
}

const hoursFmt = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function Invoices({ searchParams }: PageProps<"/admin/invoices">) {
  await requireAdmin();
  const query = await searchParams;
  const now = await requestNow();
  const month = parseMonth(typeof query.month === "string" ? query.month : undefined, now);

  const [employees, companies, entries, billings, withLogo, items] = await Promise.all([
    listEmployees(),
    listCompanies(),
    listMonthEntries(month, {}),
    listBillingProfilesWithoutLogo(),
    listUsersWithLogo(),
    listInvoiceItems(monthParam(month)),
  ]);
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const billingByUser = new Map(billings.map((b) => [b.user_id, { ...b, logo: withLogo.has(b.user_id) ? "sí" : null }]));

  const skipped = employees.filter((p) => !generatesInvoice(p));
  const rows = employees.filter(generatesInvoice).map((p) => ({
    profile: p,
    invoice: invoiceTotals(p, entries, month, now, items),
    missing: missingBillingFields(billingByUser.get(p.user_id) ?? null),
  }));
  const total = rows.reduce((sum, r) => sum + (r.invoice.amount === null ? 0 : r.invoice.total), 0);
  const ready = rows.filter((r) => r.missing.length === 0 && r.invoice.amount !== null).length;
  const link = (m: typeof month) => `/admin/invoices?month=${monthParam(m)}`;

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href={link(shiftMonth(month, -1))} className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100" aria-label="Mes anterior">←</Link>
        <span className="font-semibold text-slate-900">{monthLabel(month)}</span>
        <Link href={link(shiftMonth(month, 1))} className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100" aria-label="Mes siguiente">→</Link>
        <span className="ml-2 text-sm text-slate-500">Las facturas se calculan solas con las horas cerradas del mes.</span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Total a facturar" value={formatMoney(total)} hint={monthLabel(month)} />
        <Stat label="Facturas listas" value={`${ready} de ${rows.length}`} hint="con datos y coste por hora" />
      </div>

      <section className={`${card} overflow-x-auto p-0!`}>
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No hay empleados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Empleado</th>
                <th className="px-3 py-3 font-medium">Nº</th>
                <th className="px-3 py-3 text-right font-medium">Horas</th>
                <th className="px-3 py-3 text-right font-medium">Coste/h</th>
                <th className="px-3 py-3 text-right font-medium">Importe</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ profile, invoice, missing }) => {
                const href = `/admin/invoices/${profile.id}?month=${monthParam(month)}`;
                return (
                  <tr key={profile.id}>
                    <td className="px-5 py-3">
                      <Link href={href} className="font-medium text-slate-900 hover:text-teal-700">{profile.full_name || profile.email}</Link>
                      <div className="text-slate-500">{profile.company_id ? companyById.get(profile.company_id)?.name : "Sin empresa"}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-500">{invoice.number}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{hoursFmt.format(invoice.hours)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{invoice.rate === null ? "—" : formatMoney(invoice.rate)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                      {invoice.amount === null ? "—" : formatMoney(invoice.total)}
                      {invoice.items.length > 0 && <div className="text-xs font-normal text-slate-500">+{invoice.items.length} concepto{invoice.items.length > 1 ? "s" : ""}</div>}
                    </td>
                    <td className="px-5 py-3">
                      {invoice.rate === null ? (
                        <Link href={`/admin/employees/${profile.id}`} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 hover:underline">Sin coste/hora</Link>
                      ) : missing.length > 0 ? (
                        <span title={`Falta: ${missing.join(", ")}`} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                          Faltan {missing.length} datos del empleado
                        </span>
                      ) : (
                        <Link href={href} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 hover:underline">Ver factura →</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {skipped.length > 0 && (
        <p className="text-sm text-slate-500">
          No generan factura:{" "}
          {skipped.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              <Link href={`/admin/employees/${p.id}`} className="hover:text-teal-700">{p.full_name || p.email}</Link>
            </span>
          ))}
          .
        </p>
      )}
    </>
  );
}
