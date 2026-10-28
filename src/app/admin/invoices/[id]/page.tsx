import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { Loading } from "@/components/loading";
import { PrintButton } from "@/components/print-button";
import { card } from "@/components/ui";
import { InvoiceItemsEditor } from "@/components/invoice-items-editor";
import { getBillingProfile, getCompanyById, getProfileById, listInvoiceItems, listMonthEntries, missingBillingFields } from "@/lib/data";
import { invoiceTotals } from "@/lib/invoice";
import { requestNow } from "@/lib/now";
import { requireAdmin } from "@/lib/session";
import { dayKey, monthParam, parseMonth } from "@/lib/time";

export default function AdminInvoicePage(props: PageProps<"/admin/invoices/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminInvoice {...props} />
    </Suspense>
  );
}

async function AdminInvoice({ params, searchParams }: PageProps<"/admin/invoices/[id]">) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const now = await requestNow();
  const month = parseMonth(typeof query.month === "string" ? query.month : undefined, now);
  const profile = Number(id) > 0 ? await getProfileById(Number(id)) : null;
  if (!profile || profile.role !== "employee") notFound();

  const [billing, company, entries, items] = await Promise.all([
    getBillingProfile(profile.user_id),
    profile.company_id ? getCompanyById(profile.company_id) : null,
    listMonthEntries(month, { userId: profile.user_id }),
    listInvoiceItems(monthParam(month), profile.user_id),
  ]);
  const invoice = invoiceTotals(profile, entries, month, now, items);
  const missing = missingBillingFields(billing);
  const name = profile.full_name || profile.email;
  const back = (
    <Link href={`/admin/invoices?month=${monthParam(month)}`} className="text-sm text-slate-500 hover:text-teal-700">
      ← Facturas
    </Link>
  );

  if (!billing || missing.length > 0 || invoice.rate === null || invoice.amount === null) {
    return (
      <div className="space-y-4">
        {back}
        <section className={`${card} max-w-xl`}>
          <h1 className="text-lg font-semibold text-slate-900">La factura de {name} aún no está lista</h1>
          <ul className="mt-3 list-inside list-disc space-y-1 text-slate-600">
            {invoice.rate === null && (
              <li>
                Falta su coste por hora: <Link href={`/admin/employees/${profile.id}`} className="text-teal-700 hover:underline">configúralo en su ficha</Link>.
              </li>
            )}
            {missing.length > 0 && <li>El empleado debe completar sus datos de facturación: {missing.join(", ")}.</li>}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {back}
        <PrintButton />
      </div>
      <InvoiceDocument
        invoice={{ ...invoice, rate: invoice.rate, amount: invoice.amount }}
        billing={billing}
        clientName={company?.name ?? "—"}
        issuedKey={dayKey(now)}
        inProgress={monthParam(month) === dayKey(now).slice(0, 7)}
      />
      <InvoiceItemsEditor profileId={profile.id} month={monthParam(month)} items={invoice.items} />
    </div>
  );
}
