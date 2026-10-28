import Link from "next/link";
import { btnPrimary, btnSmall, card } from "./ui";
import type { TimeEntry } from "@/lib/data";
import { getBillingProfile, getProfileById, listInvoiceItems, missingBillingFields } from "@/lib/data";
import { invoiceTotals } from "@/lib/invoice";
import { translator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { dayKey, monthLabel, monthParam, type Month } from "@/lib/time";

const hoursFmt = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Resumen de la factura del mes, que se va acumulando con cada fichaje cerrado. */
export async function InvoiceCard({ profileId, userId, slug, month, entries, now }: {
  profileId: number;
  userId: number;
  slug: string;
  month: Month;
  entries: TimeEntry[];
  now: Date;
}) {
  const [profile, billing, locale, items] = await Promise.all([
    getProfileById(profileId),
    getBillingProfile(userId),
    getLocale(),
    listInvoiceItems(monthParam(month), userId),
  ]);
  const t = translator(locale);
  if (!profile) return null;
  const invoice = invoiceTotals(profile, entries, month, now, items);
  const missing = missingBillingFields(billing);
  const inProgress = monthParam(month) === dayKey(now).slice(0, 7);

  return (
    <section className={`${card} flex flex-wrap items-center justify-between gap-4`}>
      <div>
        <p className="text-sm text-slate-500">
          {t("invoiceCard.title", { month: locale === "es" ? monthLabel(month, locale).toLowerCase() : monthLabel(month, locale) })}
          {inProgress && <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">{t("invoiceCard.live")}</span>}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
          {invoice.amount === null ? "—" : formatMoney(invoice.total)}
          <span className="ml-2 text-base font-normal text-slate-500">{hoursFmt.format(invoice.hours)} h</span>
        </p>
        {invoice.rate === null && <p className="mt-1 text-sm text-amber-700">{t("invoiceCard.noRate")}</p>}
        {invoice.rate !== null && missing.length > 0 && (
          <p className="mt-1 text-sm text-amber-700">{t("invoiceCard.missing", { fields: missing.join(", ") })}</p>
        )}
      </div>
      <Link href={`/${slug}/invoice?month=${monthParam(month)}`} className={`${btnPrimary} ${btnSmall}`}>
        {missing.length > 0 ? t("invoiceCard.complete") : t("invoiceCard.view")}
      </Link>
    </section>
  );
}
