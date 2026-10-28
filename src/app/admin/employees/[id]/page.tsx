import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminGoals } from "@/components/admin-goals";
import { EquipmentList } from "@/components/equipment-list";
import { CostForm } from "@/components/cost-form";
import { AssignCompanyForm, GeoRequiredForm, ResetPasswordForm, ToggleActiveForm } from "@/components/employee-controls";
import { ExportLink } from "@/components/export-link";
import { HoursPanel } from "@/components/hours-panel";
import { LiveTimer } from "@/components/live-timer";
import { Loading } from "@/components/loading";
import { btnSecondary, btnSmall, card, pageTitle } from "@/components/ui";
import { equipmentImageIds, getOpenEntry, getProfileById, listCompanies, listEquipment, listMonthAbsences, listMonthEntries } from "@/lib/data";
import { requireAdmin } from "@/lib/session";
import { requestNow } from "@/lib/now";
import { dayKey, formatTime, monthParam, parseMonth } from "@/lib/time";

export default function EmployeePage(props: PageProps<"/admin/employees/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Employee {...props} />
    </Suspense>
  );
}

async function Employee({ params, searchParams }: PageProps<"/admin/employees/[id]">) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const profileId = Number(id);
  const profile = Number.isInteger(profileId) && profileId > 0 ? await getProfileById(profileId) : null;
  if (!profile || profile.role !== "employee") notFound();

  const now = await requestNow();
  const month = parseMonth(typeof query.month === "string" ? query.month : undefined, now);
  const [companies, open, entries, absences, equipment] = await Promise.all([
    listCompanies(),
    getOpenEntry(profile.user_id),
    listMonthEntries(month, { userId: profile.user_id }),
    listMonthAbsences(profile.user_id, month),
    listEquipment(profile.user_id),
  ]);
  const equipmentImages = await equipmentImageIds(equipment.map((e) => e.id));
  const company = companies.find((c) => c.id === profile.company_id);

  return (
    <div className="space-y-6">
      <Link href="/admin/employees" className="text-sm text-slate-500 hover:text-teal-700">← Empleados</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={pageTitle}>{profile.full_name || profile.email}</h1>
          <p className="text-slate-500">
            {profile.email} · {company ? company.name : "Sin empresa"}
            {!profile.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">Desactivado</span>}
          </p>
        </div>
        {open ? (
          <p className="rounded-xl bg-teal-50 px-4 py-2 text-sm text-teal-800">
            Trabajando desde {formatTime(open.clock_in)} · <strong><LiveTimer since={open.clock_in} /></strong>
          </p>
        ) : (
          <p className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">Fuera de turno</p>
        )}
      </div>

      <section className={`${card} flex flex-wrap items-start gap-x-8 gap-y-4`}>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Empresa</p>
          <AssignCompanyForm profile={profile} companies={companies} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Coste</p>
          <CostForm profile={profile} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Pedir ubicación al fichar</p>
          <GeoRequiredForm profile={profile} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Contraseña</p>
          <ResetPasswordForm profile={profile} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Acceso</p>
          <ToggleActiveForm profile={profile} />
        </div>
      </section>

      <AdminGoals profile={profile} today={dayKey(now)} />

      <EquipmentList items={equipment} images={equipmentImages} admin={{ profileId: profile.id, today: dayKey(now) }} />

      <HoursPanel
        entries={entries}
        month={month}
        now={now}
        basePath={`/admin/employees/${profile.id}`}
        hourlyRate={profile.hourly_rate}
        absences={absences}
        actions={
          <>
            <ExportLink month={month} employee={profile.id} />
            <Link href={`/admin/invoices/${profile.id}?month=${monthParam(month)}`} className={`${btnSecondary} ${btnSmall}`}>
              🧾 Ver factura
            </Link>
          </>
        }
      />
    </div>
  );
}
