import { getCompanyById, getProfileById, listEmployees, listMonthEntries } from "@/lib/data";
import { companyReport, employeeReport } from "@/lib/report";
import { getCurrentUser } from "@/lib/session";
import { parseMonth } from "@/lib/time";

// GET /api/report?month=2026-10               → informe propio (sin costes si es empleado)
// GET /api/report?month=2026-10&employee=<id> → informe de un empleado (solo admin)
// GET /api/report?month=2026-10&company=<id>  → informe de una empresa (solo admin)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const now = new Date();
  const month = parseMonth(params.get("month") ?? undefined, now);
  const employeeId = Number(params.get("employee")) || null;
  const companyId = Number(params.get("company")) || null;
  if ((employeeId || companyId) && user.role !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let report;
  if (companyId) {
    const company = await getCompanyById(companyId);
    if (!company) return Response.json({ error: "Empresa no encontrada" }, { status: 404 });
    const [employees, entries] = await Promise.all([
      listEmployees(company.id),
      listMonthEntries(month, { companyId: company.id }),
    ]);
    report = companyReport({ company, month, employees, entries, now });
  } else {
    const profile = await getProfileById(employeeId ?? user.profileId);
    if (!profile) return Response.json({ error: "Empleado no encontrado" }, { status: 404 });
    const [company, entries] = await Promise.all([
      profile.company_id ? getCompanyById(profile.company_id) : null,
      listMonthEntries(month, { userId: profile.user_id }),
    ]);
    report = employeeReport({ profile, company, month, entries, now, withCost: user.role === "admin" });
  }

  return new Response(report.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
