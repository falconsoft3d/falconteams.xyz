import { bearerUser, clockingCompany, json, preflight } from "@/lib/ext-api";
import * as data from "@/lib/data";

export const OPTIONS = preflight;

// POST { action: "in" | "out", notes?, lat?, lng?, accuracy? }
export async function POST(request: Request) {
  const user = await bearerUser(request);
  if (!user) return json({ error: "Sesión caducada" }, 401);
  const target = clockingCompany(user);
  if (!target.ok) return json({ error: "Tu empresa está desactivada." }, 403);

  const body = await request.json().catch(() => ({}));
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const hasGeo = body.lat != null && body.lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  if (user.geoRequired && !hasGeo) return json({ error: "Debes permitir el acceso a tu ubicación para fichar." }, 400);
  const at = hasGeo ? { lat, lng, accuracy: Number.isFinite(Number(body.accuracy)) ? Math.round(Number(body.accuracy)) : null } : null;

  try {
    if (body.action === "in") {
      await data.clockIn(user.userId, target.companyId, at);
    } else if (body.action === "out") {
      const notes = String(body.notes ?? "").trim().slice(0, 2000);
      await data.clockOut(user.userId, notes || null, at);
    } else {
      return json({ error: "Acción no válida." }, 400);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "No se pudo fichar." }, 409);
  }
  return json({ ok: true });
}
