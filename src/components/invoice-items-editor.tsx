import { ActionForm } from "./action-form";
import { btnDanger, btnPrimary, btnSmall, card, input, label } from "./ui";
import { addInvoiceItemAction, deleteInvoiceItemAction } from "@/lib/actions";
import type { InvoiceLine } from "@/lib/invoice";
import { formatMoney } from "@/lib/money";

/** Añadir o quitar conceptos extra de la factura (no se imprime). */
export function InvoiceItemsEditor({ profileId, month, items }: { profileId: number; month: string; items: InvoiceLine[] }) {
  return (
    <section className={`${card} mx-auto max-w-3xl print:hidden`}>
      <h2 className="font-semibold text-slate-900">Otros conceptos</h2>
      <p className="mb-3 mt-1 text-sm text-slate-500">Añade a la factura gastos o equipos, por ejemplo «PC portátil · 1 · 1.400». Usa un precio negativo para un descuento.</p>
      {items.length > 0 && (
        <ul className="mb-4 divide-y divide-slate-100 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-slate-800">{i.description}</span>
              <span className="tabular-nums text-slate-500">{i.quantity} × {formatMoney(i.unitPrice)}</span>
              <span className="w-24 text-right font-medium tabular-nums text-slate-900">{formatMoney(i.amount)}</span>
              <ActionForm action={deleteInvoiceItemAction} showOk={false}>
                <input type="hidden" name="profile_id" value={profileId} />
                <input type="hidden" name="item_id" value={i.id} />
                <button className={`${btnDanger} ${btnSmall}`} aria-label={`Quitar ${i.description}`}>✕</button>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={addInvoiceItemAction} showOk={false} className="grid gap-2 sm:grid-cols-[1fr_5rem_8rem_auto] sm:items-end">
        <input type="hidden" name="profile_id" value={profileId} />
        <input type="hidden" name="month" value={month} />
        <div>
          <label htmlFor="item-desc" className={label}>Concepto</label>
          <input id="item-desc" name="description" required maxLength={200} placeholder="PC portátil" className={input} />
        </div>
        <div>
          <label htmlFor="item-qty" className={label}>Cant.</label>
          <input id="item-qty" name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" className={input} />
        </div>
        <div>
          <label htmlFor="item-price" className={label}>Precio (€)</label>
          <input id="item-price" name="unit_price" type="number" step="0.01" required placeholder="1400" className={input} />
        </div>
        <button className={`${btnPrimary} ${btnSmall} h-[38px]`}>Añadir</button>
      </ActionForm>
    </section>
  );
}
