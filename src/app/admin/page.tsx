import { Suspense } from "react";
import Link from "next/link";
import { Loading } from "@/components/loading";
import { Stat } from "@/components/stat";
import { card, pageTitle } from "@/components/ui";
import { LiveTimer } from "@/components/live-timer";
import { MyClock } from "@/components/my-clock";
import { listCompanies, listMonthEntries, listOpenEntries, listProfiles } from "@/lib/data";
import { getLocale, getT } from "@/lib/locale";
import { requireAdmin } from "@/lib/session";
import { requestNow } from "@/lib/now";
import { durationMs, formatHours, formatTime, monthLabel, parseMonth } from "@/lib/time";

export default function AdminHome() {
  return (
    <Suspense fallback={<Loading />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const admin = await requireAdmin();
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  const now = await requestNow();
  const month = parseMonth(undefined, now);
  const [companies, profiles, open, entries] = await Promise.all([
    listCompanies(),
    listProfiles(),
    listOpenEntries(),
    listMonthEntries(month, {}),
  ]);

  const employees = profiles.filter((p) => p.role === "employee");
  const profileByUser = new Map(profiles.map((p) => [p.user_id, p]));
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const monthMs = entries.reduce((sum, e) => sum + durationMs(e, now), 0);

  const perCompany = companies.map((c) => ({
    company: c,
    employees: employees.filter((e) => e.company_id === c.id).length,
    working: open.filter((e) => e.company_id === c.id).length,
    ms: entries.filter((e) => e.company_id === c.id).reduce((s, e) => s + durationMs(e, now), 0),
  }));

  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>{t("admin.title")}</h1>

      <MyClock userId={admin.userId} autoCloseHours={null} now={now} person={admin} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t("admin.activeCompanies")} value={companies.filter((c) => c.active).length} />
        <Stat label={t("admin.activeEmployees")} value={employees.filter((e) => e.active).length} />
        <Stat label={t("admin.workingNow")} value={open.length} />
        <Stat label={t("admin.hoursThisMonth")} value={formatHours(monthMs)} hint={monthLabel(month, locale)} />
      </div>

      <section className={card}>
        <h2 className="mb-3 font-semibold text-slate-900">{t("admin.workingNow")}</h2>
        {open.length === 0 ? (
          <p className="text-sm text-slate-500">{t("admin.nobodyWorking")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {open.map((entry) => {
              const emp = profileByUser.get(entry.user_id);
              return (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    {emp ? (
                      <Link
                        href={emp.role === "admin" ? "/admin/me" : `/admin/employees/${emp.id}`}
                        className="font-medium text-slate-900 hover:text-teal-700"
                      >
                        {emp.full_name || emp.email}
                        {emp.role === "admin" && <span className="ml-1.5 text-xs font-normal text-slate-500">(admin)</span>}
                      </Link>
                    ) : (
                      <span className="text-slate-500">{t("admin.user")} #{entry.user_id}</span>
                    )}
                    <span className="ml-2 text-slate-500">{entry.company_id ? companyById.get(entry.company_id)?.name : ""}</span>
                  </div>
                  <span className="text-slate-600">
                    {t("admin.since")} {formatTime(entry.clock_in)} · <span className="font-semibold text-teal-700"><LiveTimer since={entry.clock_in} /></span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{t("admin.companies")}</h2>
          <Link href="/admin/companies" className="text-sm text-teal-700 hover:underline">{t("admin.manage")}</Link>
        </div>
        {perCompany.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t("admin.noCompanies")} <Link href="/admin/companies" className="text-teal-700 hover:underline">{t("admin.createFirst")}</Link>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr><th className="py-2 font-medium">{t("admin.colCompany")}</th><th className="font-medium">{t("admin.colEmployees")}</th><th className="font-medium">{t("admin.colWorking")}</th><th className="font-medium">{t("admin.colMonthHours")}</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {perCompany.map(({ company, employees, working, ms }) => (
                  <tr key={company.id}>
                    <td className="py-2.5 font-medium text-slate-900">
                      {company.name}
                      {!company.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{t("admin.inactive")}</span>}
                    </td>
                    <td>{employees}</td>
                    <td>{working}</td>
                    <td className="tabular-nums">{formatHours(ms)}</td>
                    <td className="text-right">
                      <Link href={`/${company.slug}`} className="text-teal-700 hover:underline">{t("admin.openDashboard")}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
