import { btnSecondary, btnSmall } from "./ui";
import { getT } from "@/lib/locale";
import { monthParam, type Month } from "@/lib/time";

/** Descarga del informe mensual en CSV (ver /api/report). */
export async function ExportLink({ month, employee, company }: { month: Month; employee?: number; company?: number }) {
  const params = new URLSearchParams({ month: monthParam(month) });
  if (employee) params.set("employee", String(employee));
  if (company) params.set("company", String(company));
  const t = await getT();
  return (
    <a href={`/api/report?${params}`} download className={`${btnSecondary} ${btnSmall}`}>
      {t("hours.export")}
    </a>
  );
}
