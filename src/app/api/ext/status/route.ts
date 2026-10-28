import { bearerUser, json, preflight } from "@/lib/ext-api";
import { getOpenEntry, listMonthEntries } from "@/lib/data";
import { dayKey, durationMs, parseMonth } from "@/lib/time";

export const OPTIONS = preflight;

// GET → estado de fichaje del usuario del token.
export async function GET(request: Request) {
  const user = await bearerUser(request);
  if (!user) return json({ error: "Sesión caducada" }, 401);
  const now = new Date();
  const [open, entries] = await Promise.all([getOpenEntry(user.userId), listMonthEntries(parseMonth(undefined, now), { userId: user.userId })]);
  const today = dayKey(now);
  const todayClosedMs = entries.filter((e) => e.clock_out && dayKey(e.clock_in) === today).reduce((s, e) => s + durationMs(e, now), 0);
  const company = user.company;
  return json({
    user: { name: user.name, role: user.role },
    company: company ? { name: company.name, slug: company.slug, autoCloseHours: company.auto_close ? company.auto_close_hours : null } : null,
    open: open ? { clockIn: open.clock_in } : null,
    todayClosedMs,
    geoRequired: user.geoRequired,
  });
}
