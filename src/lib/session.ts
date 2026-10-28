import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "./fdb";
import { generatesInvoice, getCompanyById, getCompanyBySlug, getProfileByUserId, type Company, type Role } from "./data";

// La cookie guarda el token de sesión de falcondatabase (httpOnly: el navegador
// no puede leerlo). El rol y la empresa se leen siempre de la tabla privada
// "profiles", nunca de los datos del usuario, que él mismo podría modificar.

const COOKIE = "ft_session";

export type CurrentUser = {
  userId: number;
  profileId: number;
  email: string;
  name: string;
  role: Role;
  company: Company | null;
  /** El admin ha pedido registrar su ubicación al fichar. */
  geoRequired: boolean;
  /** Genera factura con sus horas (si no, se ocultan factura y datos de facturación). */
  invoiced: boolean;
  /** URL de la foto de perfil (cambia al subir otra), o null. */
  avatarUrl: string | null;
};

export async function setSessionCookie(token: string, maxAge: number) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

/** Usuario de la petición actual, o null. */
export async function getCurrentUser() {
  // cookies() se lee fuera de cache(): en una server action, la fase de la
  // acción y el render posterior usan objetos de cookies distintos.
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? userForToken(token) : null;
}

/** Resuelve el usuario de un token; se memoiza durante la petición. */
export const userForToken = cache(async (token: string): Promise<CurrentUser | null> => {
  const authUser = await getAuthUser(token);
  if (!authUser) return null;
  const profile = await getProfileByUserId(authUser.id);
  if (!profile || !profile.active) return null;
  const company = profile.company_id ? await getCompanyById(profile.company_id) : null;
  return {
    userId: authUser.id,
    profileId: profile.id,
    email: profile.email,
    name: profile.full_name || profile.email,
    role: profile.role,
    company,
    geoRequired: profile.geo_required,
    invoiced: generatesInvoice(profile),
    avatarUrl: avatarUrl(profile),
  };
});

/** URL de la foto de un perfil; la fecha en la query evita servir una versión vieja de caché. */
export function avatarUrl(profile: { user_id: number; avatar_updated_at: string | null }) {
  return profile.avatar_updated_at
    ? `/api/avatar/${profile.user_id}?v=${new Date(profile.avatar_updated_at).getTime()}`
    : null;
}

/** URL a la que debe ir un usuario tras iniciar sesión. */
export function homeFor(user: CurrentUser) {
  if (user.role === "admin") return "/admin";
  return user.company ? `/${user.company.slug}` : "/login?error=sin-empresa";
}

export async function requireUser(loginPath = "/login") {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect(homeFor(user));
  return user;
}

/** Empleado de la empresa del slug (para páginas solo de empleados: facturación, ajustes…). */
export async function requireCompanyEmployee(slug: string) {
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();
  const user = await requireUser(`/${slug}/login`);
  if (user.role !== "employee" || user.company?.id !== company.id) redirect(homeFor(user));
  return { user, company };
}

/**
 * Miembro de una empresa: sus empleados (si está activa) o un admin. Para las
 * páginas compartidas de la empresa (enlaces, documentación).
 */
export async function requireCompanyMember(slug: string) {
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();
  const user = await requireUser(`/${slug}/login`);
  const isAdmin = user.role === "admin";
  if (!isAdmin && (user.company?.id !== company.id || !company.active)) redirect(homeFor(user));
  return { user, company, isAdmin };
}
