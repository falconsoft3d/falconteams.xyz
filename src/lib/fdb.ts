import "server-only";
import { connection } from "next/server";

// Cliente mínimo de falcondatabase. Solo se ejecuta en el servidor:
// - Las tablas son privadas, así que se leen/escriben con el token de servidor.
// - El login de usuarios usa la API REST pública del proyecto con la clave anon.

const BASE = process.env.FDB_URL ?? "https://falcondatabase.com";
const PROJECT = process.env.FDB_PROJECT!;
const ANON_KEY = process.env.FDB_ANON_KEY!;
const SERVER_TOKEN = process.env.FDB_AI_TOKEN!;

export class FdbError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  // Los datos son siempre de la petición: sin esto, el prerenderizado de Next
  // empieza la consulta y avisa de valores inestables (Date.now() dentro de fetch).
  await connection();
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": "es",
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new FdbError(body.error ?? `Error ${res.status} en falcondatabase`, res.status);
  }
  return body as T;
}

function tool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  return request<{ data: T }>(`${BASE}/api/ai/tools/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVER_TOKEN}` },
    body: JSON.stringify({ project: PROJECT, ...args }),
  }).then((r) => r.data);
}

// ---------- Tablas ----------

type Filters = Record<string, string | number | boolean>;

type QueryOptions = {
  filters?: Filters;
  select?: string[];
  order?: string;
  limit?: number;
  offset?: number;
};

export async function query<T>(table: string, opts: QueryOptions = {}) {
  return tool<{ data: T[]; count: number }>("query_rows", { table, ...opts });
}

/** Lee todas las filas que cumplan los filtros, paginando de 500 en 500. */
export async function queryAll<T>(table: string, opts: Omit<QueryOptions, "limit" | "offset"> = {}) {
  const pageSize = 500;
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await query<T>(table, { ...opts, limit: pageSize, offset });
    rows.push(...page.data);
    if (page.data.length < pageSize || rows.length >= page.count) return rows;
  }
}

export async function queryOne<T>(table: string, filters: Filters) {
  const { data } = await query<T>(table, { filters, limit: 1 });
  return data[0] ?? null;
}

export async function insert<T>(table: string, rows: Record<string, unknown>[]) {
  const { data } = await tool<{ data: T[] }>("insert_rows", { table, rows });
  return data;
}

export async function update<T>(table: string, id: number, values: Record<string, unknown>) {
  return tool<T>("update_row", { table, id, values });
}

export async function remove(table: string, ids: number[]) {
  return tool("delete_rows", { table, ids });
}

// ---------- Usuarios de la app ----------

export type FdbUser = {
  id: number;
  email: string;
  data: Record<string, unknown>;
  is_active?: boolean;
};

export async function createAuthUser(email: string, password: string, data: Record<string, unknown>) {
  const { user } = await tool<{ user: FdbUser }>("create_user", { email, password, data });
  return user;
}

export async function updateAuthUser(
  user: number,
  values: { password?: string; is_active?: boolean; data?: Record<string, unknown> },
) {
  return tool("update_user", { user, ...values });
}

export async function deleteAuthUser(user: number) {
  return tool("delete_user", { user });
}

// ---------- Login (API REST del proyecto) ----------

const authUrl = (path: string) => `${BASE}/api/v1/${PROJECT}/auth/${path}`;

export async function signIn(email: string, password: string) {
  return request<{ user: FdbUser; token: string; expires_in: number }>(authUrl("login"), {
    method: "POST",
    headers: { apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
}

/** Valida un token de sesión y devuelve su usuario, o null si no es válido. */
export async function getAuthUser(token: string) {
  try {
    const { user } = await request<{ user: FdbUser }>(authUrl("user"), {
      method: "GET",
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    });
    return user;
  } catch {
    return null;
  }
}
