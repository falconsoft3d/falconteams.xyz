import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmployeeShell } from "@/components/employee-shell";
import { InvoiceDocument } from "@/components/invoice-document";
import { Loading } from "@/components/loading";
import { PrintButton } from "@/components/print-button";
import { card } from "@/components/ui";
import { InvoiceItemsEditor } from "@/components/invoice-items-editor";
import { getBillingProfile, getProfileById, listInvoiceItems, listMonthEntries, missingBillingFields } from "@/lib/data";
import { invoiceTotals } from "@/lib/invoice";
import { requestNow } from "@/lib/now";
import { requireCompanyEmployee } from "@/lib/session";
import { dayKey, monthParam, parseMonth } from "@/lib/time";

export default function InvoicePage(props: PageProps<"/[company]/invoice">) {
  return (
    <Suspense fallback={<Loading />}>
      <Invoice {...props} />
    </Suspense>
  );
}

async function Invoice({ params, searchParams }: PageProps<"/[company]/invoice">) {
  const [{ company: slug }, query] = await Promise.all([params, searchParams]);
  const { user, company } = await requireCompanyEmployee(slug);
  const now = await requestNow();
  const month = parseMonth(typeof query.month === "string" ? query.month : undefined, now);

  const [billing, profile, entries, items] = await Promise.all([
    getBillingProfile(user.userId),
    getProfileById(user.profileId),
    listMonthEntries(month, { userId: user.userId }),
    listInvoiceItems(monthParam(month), user.userId),
  ]);
  if (!billing || missingBillingFields(billing).length > 0) redirect(`/${slug}/billing?invoice=${monthParam(month)}`);

  const back = `/${slug}?month=${monthParam(month)}`;
  const invoice = invoiceTotals(profile!, entries, month, now, items);
  if (invoice.rate === null || invoice.amount === null) {
    return (
      <EmployeeShell user={user} company={company}>
        <section className={`${card} max-w-xl`}>
          <h1 className="text-lg font-semibold text-slate-900">Aún no se puede generar la factura</h1>
          <p className="mt-2 text-slate-600">Tu administrador todavía no ha fijado tu coste por hora. Pídele que lo configure.</p>
          <Link href={back} className="mt-4 inline-block text-sm text-teal-700 hover:underline">← Volver a mi panel</Link>
        </section>
      </EmployeeShell>
    );
  }

  return (
    <EmployeeShell user={user} company={company}>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={back} className="text-sm text-slate-500 hover:text-teal-700">← Volver a mi panel</Link>
        <div className="flex items-center gap-3">
          <Link href={`/${slug}/billing`} className="text-sm text-slate-500 hover:text-teal-700">Editar mis datos</Link>
          <PrintButton />
        </div>
      </div>
      <InvoiceDocument
        invoice={{ ...invoice, rate: invoice.rate, amount: invoice.amount }}
        billing={billing}
        clientName={company.name}
        issuedKey={dayKey(now)}
        inProgress={monthParam(month) === dayKey(now).slice(0, 7)}
      />
      <InvoiceItemsEditor profileId={user.profileId} month={monthParam(month)} items={invoice.items} />
    </EmployeeShell>
  );
}
