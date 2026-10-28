import type { BillingProfile, InvoiceTemplate } from "@/lib/data";
import type { InvoiceTotals } from "@/lib/invoice";
import { billableHours, formatMoney } from "@/lib/money";
import { formatDayKey, monthLabel } from "@/lib/time";

const hoursFmt = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

type Props = {
  invoice: InvoiceTotals & { rate: number; amount: number };
  billing: BillingProfile;
  clientName: string;
  issuedKey: string;
  /** El mes aún no ha terminado: las horas seguirán acumulándose. */
  inProgress: boolean;
};

/**
 * Documento de factura listo para imprimir, en el diseño elegido por el
 * empleado (clásico, moderno o minimalista) y con su color de acento.
 */
export function InvoiceDocument(props: Props) {
  const template: InvoiceTemplate = props.billing.invoice_template ?? "classic";
  const accent = props.billing.accent_color || "#0f766e";
  const { invoice, billing, clientName, issuedKey, inProgress } = props;
  const { month, days, hours, rate, amount, items, total } = invoice;
  const issued = formatDayKey(issuedKey).replace(/^[^,]+, /, "");

  const lines = [
    { key: "hours", concept: billing.service_name ?? "", detail: `${monthLabel(month)} · ${days.length} días trabajados`, qty: `${hoursFmt.format(hours)} h`, price: formatMoney(rate), amount: formatMoney(amount) },
    ...items.map((i) => ({ key: `item-${i.id}`, concept: i.description, detail: "", qty: qtyFmt.format(i.quantity), price: formatMoney(i.unitPrice), amount: formatMoney(i.amount) })),
  ];

  const logo = billing.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- data URL guardada en la base de datos
    <img src={billing.logo} alt={`Logo de ${billing.legal_name}`} className={template === "minimal" ? "max-h-12 max-w-36 object-contain" : "max-h-20 max-w-48 object-contain"} />
  ) : (
    <span />
  );

  const issuer = (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Emisor</p>
      <p className="font-semibold text-slate-900">{billing.legal_name}</p>
      <p>NIF/CI: {billing.tax_id}</p>
      <p className="whitespace-pre-line">{billing.address}</p>
      <p>{billing.country}</p>
    </div>
  );
  const client = (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
      <p className="font-semibold text-slate-900">{clientName}</p>
    </div>
  );
  const meta = (
    <>
      <p>Nº <strong>{invoice.number}</strong></p>
      <p>Fecha: {issued}</p>
      <p>Periodo: {monthLabel(month)}</p>
    </>
  );

  const table = (
    <table className="w-full">
      <thead>
        <tr
          className={`text-left text-xs uppercase tracking-wide ${template === "modern" ? "text-white" : "text-slate-500"} ${template === "classic" ? "border-b-2" : template === "minimal" ? "border-b" : ""}`}
          style={template === "modern" ? { backgroundColor: accent } : { borderColor: template === "classic" ? accent : undefined }}
        >
          <th className={`py-2 font-semibold ${template === "modern" ? "pl-3" : ""}`}>Concepto</th>
          <th className="py-2 text-right font-semibold">Cantidad</th>
          <th className="py-2 text-right font-semibold">Precio</th>
          <th className={`py-2 text-right font-semibold ${template === "modern" ? "pr-3" : ""}`}>Importe</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.key} className="border-b border-slate-200">
            <td className={`py-3 ${template === "modern" ? "pl-3" : ""}`}>
              <p className="font-medium text-slate-900">{l.concept}</p>
              {l.detail && <p className="text-slate-500">{l.detail}</p>}
            </td>
            <td className="py-3 text-right tabular-nums">{l.qty}</td>
            <td className="py-3 text-right tabular-nums">{l.price}</td>
            <td className={`py-3 text-right tabular-nums ${template === "modern" ? "pr-3" : ""}`}>{l.amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const totals = (
    <div className="mt-6 flex justify-end">
      <div className="w-64 space-y-1">
        {items.length > 0 && (
          <>
            <div className="flex justify-between text-slate-600"><span>Horas</span><span className="tabular-nums">{formatMoney(amount)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Otros conceptos</span><span className="tabular-nums">{formatMoney(invoice.itemsTotal)}</span></div>
          </>
        )}
        {template === "modern" ? (
          <div className="mt-2 flex justify-between rounded-lg px-3 py-2 text-lg font-bold text-white" style={{ backgroundColor: accent }}>
            <span>Total</span><span className="tabular-nums">{formatMoney(total)}</span>
          </div>
        ) : (
          <div
            className={`flex justify-between pt-2 text-lg text-slate-900 ${template === "minimal" ? "border-t font-medium" : "border-t-2 font-bold"}`}
            style={{ borderColor: template === "classic" ? accent : undefined }}
          >
            <span>Total</span><span className="tabular-nums">{formatMoney(total)}</span>
          </div>
        )}
      </div>
    </div>
  );

  const detail = days.length > 0 && (
    <section className="mt-12 break-inside-avoid">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Detalle de horas</p>
      <div className="grid grid-cols-2 gap-x-8 text-xs text-slate-600 sm:grid-cols-3">
        {days.map(([key, ms]) => (
          <div key={key} className="flex justify-between border-b border-slate-100 py-1">
            <span className="capitalize">{formatDayKey(key)}</span>
            <span className="tabular-nums">{hoursFmt.format(billableHours(ms))} h</span>
          </div>
        ))}
      </div>
    </section>
  );

  const notice = inProgress && (
    <p className="mb-6 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 print:hidden">
      Factura en curso: se actualiza automáticamente con cada fichaje cerrado hasta que termine {monthLabel(month).toLowerCase()}.
    </p>
  );

  const shell = "mx-auto max-w-3xl bg-white text-sm text-slate-800 [print-color-adjust:exact] print:max-w-none print:shadow-none";

  if (template === "modern") {
    return (
      <article className={`${shell} overflow-hidden rounded-2xl border border-slate-200 shadow-sm print:rounded-none print:border-0`}>
        <header className="flex items-center justify-between gap-6 px-10 py-8 text-white" style={{ backgroundColor: accent }}>
          <div className="rounded-xl bg-white p-3">{logo}</div>
          <div className="text-right">
            <h1 className="text-3xl font-bold tracking-tight">FACTURA</h1>
            <div className="mt-1 text-white/90">{meta}</div>
          </div>
        </header>
        <div className="p-10">
          {notice}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">{issuer}</div>
            <div className="rounded-xl bg-slate-50 p-4">{client}</div>
          </div>
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">{table}</div>
          {totals}
          {detail}
        </div>
      </article>
    );
  }

  if (template === "minimal") {
    return (
      <article className={`${shell} rounded-2xl border border-slate-200 p-12 shadow-sm print:rounded-none print:border-0 print:p-0`}>
        {notice}
        <header className="flex items-start justify-between gap-6">
          <div>
            {logo}
            <h1 className="mt-6 text-2xl font-light tracking-tight text-slate-900">
              Factura <span style={{ color: accent }}>{invoice.number}</span>
            </h1>
          </div>
          <div className="text-right text-slate-500">{meta}</div>
        </header>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">{issuer}{client}</div>
        <div className="mt-10">{table}</div>
        {totals}
        {detail}
      </article>
    );
  }

  // Clásico
  return (
    <article className={`${shell} rounded-2xl border border-slate-200 p-10 shadow-sm print:rounded-none print:border-0 print:p-0`}>
      {notice}
      <header className="flex items-start justify-between gap-6">
        {logo}
        <div className="text-right">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: accent }}>FACTURA</h1>
          <div className="mt-1 text-slate-600">{meta}</div>
        </div>
      </header>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">{issuer}{client}</div>
      <div className="mt-10">{table}</div>
      {totals}
      {detail}
    </article>
  );
}
