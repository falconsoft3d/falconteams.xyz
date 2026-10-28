import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmployeeShell } from "@/components/employee-shell";
import { ExportLink } from "@/components/export-link";
import { HoursPanel } from "@/components/hours-panel";
import { InvoiceCard } from "@/components/invoice-card";
import { LiveTimer } from "@/components/live-timer";
import { Loading } from "@/components/loading";
import { MonthCalendar } from "@/components/month-calendar";
import { MyClock } from "@/components/my-clock";
import { Stat } from "@/components/stat";
import { card, pageTitle } from "@/components/ui";
import {
  getCompanyBySlug,
  listEmployees,
  listMonthAbsences,
  listMonthEntries,
  listOpenEntries,
  type Company,
} from "@/lib/data";
import { costOf, formatMoney } from "@/lib/money";
import { getLocale, getT } from "@/lib/locale";
import { homeFor, requireUser, type CurrentUser } from "@/lib/session";
import { requestNow } from "@/lib/now";
import {
  dayKey,
  durationMs,
  formatHours,
  formatTime,
  monthLabel,
  parseMonth,
  totalsByDay,
  type Month,
} from "@/lib/time";

export default function CompanyDashboardPage(props: PageProps<"/[company]">) {
  return (
    <Suspense fallback={<Loading />}>
      <CompanyDashboard {...props} />
    </Suspense>
  );
}

async function CompanyDashboard({ params, searchParams }: PageProps<"/[company]">) {
  const [{ company: slug }, query] = await Promise.all([params, searchParams]);
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  const user = await requireUser(`/${slug}/login`);
  const isAdmin = user.role === "admin";
  if (!isAdmin && user.company?.id !== company.id) redirect(homeFor(user));

  const now = await requestNow();
  const month = parseMonth(typeof query.month === "string" ? query.month : undefined, now);
  const t = await getT();

  return (
    <EmployeeShell user={user} company={company}>
        {!company.active && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("company.disabled")}
          </p>
        )}
        {isAdmin ? (
          <CompanyOverview company={company} month={month} now={now} />
        ) : (
          <EmployeeDashboard user={user} company={company} month={month} now={now} />
        )}
    </EmployeeShell>
  );
}

async function EmployeeDashboard({ user, company, month, now }: {
  user: CurrentUser;
  company: Company;
  month: Month;
  now: Date;
}) {
  const [entries, absences, t] = await Promise.all([
    listMonthEntries(month, { userId: user.userId }),
    listMonthAbsences(user.userId, month),
    getT(),
  ]);
  return (
    <>
      <h1 className={pageTitle}>{t("employee.hello", { name: user.name.split(" ")[0] })}</h1>
      {company.active && (
        <MyClock
          userId={user.userId}
          person={user}
          slug={company.slug}
          autoCloseHours={company.auto_close ? company.auto_close_hours : null}
          now={now}
          geo={user.geoRequired}
          companyId={company.id}
        />
      )}
      <InvoiceCard
        profileId={user.profileId}
        userId={user.userId}
        slug={company.slug}
        month={month}
        entries={entries}
        now={now}
      />
      <HoursPanel
        entries={entries}
        month={month}
        now={now}
        basePath={`/${company.slug}`}
        dayHref={(key) => `/${company.slug}/day/${key}`}
        absences={absences}
        actions={<ExportLink month={month} />}
      />
    </>
  );
}

async function CompanyOverview({ company, month, now }: { company: Company; month: Month; now: Date }) {
  const [employees, open, entries] = await Promise.all([
    listEmployees(company.id),
    listOpenEntries(company.id),
    listMonthEntries(month, { companyId: company.id }),
  ]);
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  const openByUser = new Map(open.map((e) => [e.user_id, e]));
  const totals = totalsByDay(entries, now);
  const monthMs = [...totals.values()].reduce((a, b) => a + b, 0);
  const msByUser = new Map<number, number>();
  for (const e of entries) msByUser.set(e.user_id, (msByUser.get(e.user_id) ?? 0) + durationMs(e, now));
  const costByUser = new Map(
    employees
      .filter((e) => e.hourly_rate !== null)
      .map((e) => [e.user_id, costOf(msByUser.get(e.user_id) ?? 0, e.hourly_rate!)]),
  );
  const monthCost = [...costByUser.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className={pageTitle}>{t("company.dashboardOf", { name: company.name })}</h1>
        <p className="text-sm text-slate-500">
          {t("company.employeeLogin")}: <Link href={`/${company.slug}/login`} className="font-mono text-teal-700 hover:underline">/{company.slug}/login</Link>
          {" · "}
          <Link href="/admin/companies" className="hover:text-teal-700">
            {t("company.autoClose")}: {company.auto_close ? `${company.auto_close_hours} h` : t("company.autoCloseOff")}
          </Link>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t("company.employees")} value={employees.filter((e) => e.active).length} />
        <Stat label={t("company.workingNow")} value={open.length} />
        <Stat label={t("company.monthHours")} value={formatHours(monthMs)} hint={monthLabel(month, locale)} />
        <Stat label={t("company.costToPay")} value={formatMoney(monthCost)} hint={monthLabel(month, locale)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className={`${card} overflow-x-auto p-0!`}>
          <h2 className="px-5 pt-5 font-semibold text-slate-900">{t("company.employees")}</h2>
          {employees.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              {t("company.noEmployees")} <Link href={`/admin/employees?company=${company.id}`} className="text-teal-700 hover:underline">{t("company.addEmployees")}</Link>
            </p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-medium">{t("company.colName")}</th>
                  <th className="px-3 py-2 font-medium">{t("company.colStatus")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("company.colMonthHours")}</th>
                  <th className="px-5 py-2 text-right font-medium">{t("company.colCost")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const entry = openByUser.get(emp.user_id);
                  return (
                    <tr key={emp.id} className={emp.active ? "" : "opacity-60"}>
                      <td className="px-5 py-3">
                        <Link href={`/admin/employees/${emp.id}`} className="font-medium text-slate-900 hover:text-teal-700">
                          {emp.full_name || emp.email}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        {entry ? (
                          <span className="text-teal-700">
                            {t("company.sinceTime", { time: formatTime(entry.clock_in) })} · <LiveTimer since={entry.clock_in} />
                          </span>
                        ) : (
                          <span className="text-slate-500">{emp.active ? t("company.out") : t("company.deactivated")}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatHours(msByUser.get(emp.user_id) ?? 0)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {costByUser.has(emp.user_id) ? (
                          <span title={`${formatMoney(emp.hourly_rate!)}/h`}>{formatMoney(costByUser.get(emp.user_id)!)}</span>
                        ) : (
                          <span className="text-xs text-slate-400">{t("company.noRate")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <h2 className="font-semibold text-slate-900">{t("company.companyHours")}</h2>
            <ExportLink month={month} company={company.id} />
          </div>
          <MonthCalendar month={month} totals={totals} today={dayKey(now)} basePath={`/${company.slug}`} />
        </section>
      </div>
    </>
  );
}
