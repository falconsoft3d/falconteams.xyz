import "server-only";
import { getCurrentUser, userForToken, type CurrentUser } from "./session";

// Utilidades de la API de la extensión de Chrome. Usa tokens Bearer (sin
// cookies), así que se puede abrir con CORS a cualquier origen.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS });
}

/** Usuario de la cookie de sesión (app web) o del token Bearer (extensión). */
export async function sessionOrBearerUser(request: Request): Promise<CurrentUser | null> {
  return (await getCurrentUser()) ?? (await bearerUser(request));
}

/** Usuario del token Bearer, o null. */
export async function bearerUser(request: Request): Promise<CurrentUser | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return token ? userForToken(token) : null;
}

/** Empresa desde la que ficha: la del empleado (activa) o ninguna si es admin. */
export function clockingCompany(user: CurrentUser) {
  if (user.role === "admin") return { ok: true as const, companyId: null };
  if (!user.company?.active) return { ok: false as const };
  return { ok: true as const, companyId: user.company.id };
}
