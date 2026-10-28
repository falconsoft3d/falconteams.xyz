import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { EmployeeShell } from "@/components/employee-shell";
import { ImageInput } from "@/components/file-inputs";
import { InvoiceTemplatePicker } from "@/components/invoice-template-picker";
import { Loading } from "@/components/loading";
import { btnPrimary, card, input, label, pageTitle } from "@/components/ui";
import { saveBilling } from "@/lib/actions";
import { getBillingProfile, missingBillingFields } from "@/lib/data";
import { requireCompanyEmployee } from "@/lib/session";

export default function BillingPage(props: PageProps<"/[company]/billing">) {
  return (
    <Suspense fallback={<Loading />}>
      <Billing {...props} />
    </Suspense>
  );
}

async function Billing({ params, searchParams }: PageProps<"/[company]/billing">) {
  const [{ company: slug }, query] = await Promise.all([params, searchParams]);
  const { user, company } = await requireCompanyEmployee(slug);
  if (!user.invoiced) redirect(`/${slug}`);
  const billing = await getBillingProfile(user.userId);
  const missing = missingBillingFields(billing);
  const invoiceMonth = typeof query.invoice === "string" && /^\d{4}-\d{2}$/.test(query.invoice) ? query.invoice : "";

  return (
    <EmployeeShell user={user} company={company}>
      <div>
        <h1 className={pageTitle}>Datos de facturación</h1>
        <p className="mt-1 text-slate-500">Aparecerán como emisor en las facturas que generes con tus horas.</p>
      </div>

      {missing.length > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {invoiceMonth ? "Para generar la factura completa antes tu perfil. " : ""}
          Falta: <strong>{missing.join(", ")}</strong>.
        </p>
      )}

      <section className={`${card} max-w-2xl`}>
        <ActionForm action={saveBilling} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="company" value={company.slug} />
          {invoiceMonth && <input type="hidden" name="invoice" value={invoiceMonth} />}

          <div className="flex items-center gap-4 sm:col-span-2">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
              {billing?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL guardada en la base de datos
                <img src={billing.logo} alt="Logo actual" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-slate-400">Sin logo</span>
              )}
            </div>
            <div className="flex-1">
              <label htmlFor="logo" className={label}>Logo {billing?.logo && <span className="font-normal text-slate-500">(sube otro para cambiarlo)</span>}</label>
              <ImageInput id="logo" name="logo" maxBytes={300 * 1024} maxSide={800} />
              <p className="mt-1 text-xs text-slate-500">PNG, JPG o WebP. Si pesa más de 300 KB se optimiza sola.</p>
            </div>
          </div>

          <div>
            <label htmlFor="legal_name" className={label}>Nombre o razón social</label>
            <input id="legal_name" name="legal_name" required defaultValue={billing?.legal_name ?? user.name} className={input} />
          </div>
          <div>
            <label htmlFor="tax_id" className={label}>NIF o CI</label>
            <input id="tax_id" name="tax_id" required defaultValue={billing?.tax_id ?? ""} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className={label}>Dirección</label>
            <textarea id="address" name="address" required rows={2} defaultValue={billing?.address ?? ""} className={input} />
          </div>
          <div>
            <label htmlFor="country" className={label}>País</label>
            <input id="country" name="country" required defaultValue={billing?.country ?? ""} className={input} />
          </div>
          <div>
            <label htmlFor="service_name" className={label}>Nombre del servicio</label>
            <input id="service_name" name="service_name" required placeholder="Consultoría de Odoo" defaultValue={billing?.service_name ?? ""} className={input} />
          </div>
          <InvoiceTemplatePicker template={billing?.invoice_template ?? null} accent={billing?.accent_color ?? null} />
          <div className="flex items-center gap-3 sm:col-span-2">
            <button className={btnPrimary}>{invoiceMonth ? "Guardar y generar factura" : "Guardar"}</button>
            <Link href={`/${company.slug}`} className="text-sm text-slate-500 hover:text-teal-700">Volver a mi panel</Link>
          </div>
        </ActionForm>
      </section>
    </EmployeeShell>
  );
}
