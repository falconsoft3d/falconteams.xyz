import { Suspense } from "react";
import { ExportLink } from "@/components/export-link";
import { HoursPanel } from "@/components/hours-panel";
import { Loading } from "@/components/loading";
import { MyClock } from "@/components/my-clock";
import { pageTitle } from "@/components/ui";
import { listMonthEntries } from "@/lib/data";
import { requireAdmin } from "@/lib/session";
import { requestNow } from "@/lib/now";
import { parseMonth } from "@/lib/time";

export default function MyHoursPage(props: PageProps<"/admin/me">) {
  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Mis horas</h1>
      <Suspense fallback={<Loading />}>
        <MyHours {...props} />
      </Suspense>
    </div>
  );
}

async function MyHours({ searchParams }: PageProps<"/admin/me">) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const now = await requestNow();
  const month = parseMonth(typeof query.month === "string" ? query.month : undefined, now);
  const entries = await listMonthEntries(month, { userId: admin.userId });
  return (
    <>
      <MyClock userId={admin.userId} autoCloseHours={null} now={now} person={admin} />
      <HoursPanel entries={entries} month={month} now={now} basePath="/admin/me" actions={<ExportLink month={month} />} />
    </>
  );
}
