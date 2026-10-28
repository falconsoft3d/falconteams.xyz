import "server-only";
import * as db from "./fdb";
import { dayKey, inMonth, monthQueryStart, type Month } from "./time";
import type { AbsenceType } from "./absences";
import type { MailAccount } from "./mail";

export type Role = "admin" | "employee";

export type Company = {
  id: number;
  created_at: string;
  name: string;
  slug: string;
  active: boolean;
  /** Cierra solo los fichajes que lleven abiertos más de auto_close_hours. */
  auto_close: boolean;
  auto_close_hours: number;
};

export type Profile = {
  id: number;
  created_at: string;
  user_id: number;
  email: string;
  full_name: string | null;
  role: Role;
  company_id: number | null;
  active: boolean;
  /** Coste por hora para calcular lo que hay que pagar; null si no se ha fijado. */
  hourly_rate: number | null;
  /** Si se fija, hourly_rate se calcula a partir del salario y las horas semanales. */
  monthly_salary: number | null;
  weekly_hours: number | null;
  /** Pedir la ubicación del navegador al fichar. */
  geo_required: boolean;
  /** Genera factura mensual con sus horas (false: no se le factura). */
  invoiced: boolean;
  /** Fecha de la última foto de perfil (null si no tiene). */
  avatar_updated_at: string | null;
};

export type TimeEntry = {
  id: number;
  user_id: number;
  company_id: number | null;
  clock_in: string;
  clock_out: string | null;
  /** true si la salida la puso el autocierre y no el empleado. */
  auto_closed: boolean;
  /** Lo que hizo el empleado, escrito al registrar la salida. */
  notes: string | null;
  /** true si el empleado corrigió o añadió el fichaje a mano. */
  edited: boolean;
  /** Ubicación al fichar la entrada y la salida (si se pidió); precisión en metros. */
  in_lat: number | null;
  in_lng: number | null;
  in_accuracy: number | null;
  out_lat: number | null;
  out_lng: number | null;
  out_accuracy: number | null;
};

export type GeoPoint = { lat: number; lng: number; accuracy: number | null };

// Rutas de primer nivel que no pueden usarse como slug de empresa.
const RESERVED_SLUGS = new Set(["admin", "login", "logout", "api", "_next", "favicon.ico"]);

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- Empresas ----------

export function listCompanies() {
  return db.queryAll<Company>("companies", { order: "name" });
}

export async function getCompanyBySlug(slug: string) {
  // El slug llega de la URL: se valida para que no pueda colarse un operador de filtro.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  return db.queryOne<Company>("companies", { slug: `eq.${slug}` });
}

export function getCompanyById(id: number) {
  return db.queryOne<Company>("companies", { id });
}

export async function createCompany(name: string, slugInput: string) {
  const slug = slugify(slugInput || name);
  if (!name.trim()) throw new Error("El nombre es obligatorio.");
  if (!slug) throw new Error("La dirección (slug) no es válida.");
  if (RESERVED_SLUGS.has(slug)) throw new Error(`«${slug}» es una dirección reservada.`);
  if (await getCompanyBySlug(slug)) throw new Error(`Ya existe una empresa con la dirección /${slug}.`);
  const [company] = await db.insert<Company>("companies", [{ name: name.trim(), slug }]);
  return company;
}

export function updateCompany(
  id: number,
  values: Partial<Pick<Company, "name" | "active" | "auto_close" | "auto_close_hours">>,
) {
  return db.update("companies", id, values);
}

/** Tablas con datos propios de cada empresa (sin claves foráneas: se borran a mano). */
const COMPANY_TABLES = [
  "time_allocations",
  "time_entries",
  "tasks",
  "projects",
  "doc_files",
  "doc_folders",
  "company_links",
  "company_ai",
  "chat_messages",
  "internal_mails",
  "job_applications",
  "job_offers",
  "recruit_questions",
  "equipment",
];

async function removeWhere(table: string, filters: Record<string, string | number>) {
  const rows = await db.queryAll<{ id: number }>(table, { filters, select: ["id"] });
  for (let i = 0; i < rows.length; i += 500) {
    await db.remove(table, rows.slice(i, i + 500).map((r) => r.id));
  }
  return rows.map((r) => r.id);
}

async function removeWhereIn(table: string, column: string, ids: number[]) {
  for (let i = 0; i < ids.length; i += 200) {
    await removeWhere(table, { [column]: `in.(${ids.slice(i, i + 200).join(",")})` });
  }
}

/**
 * Elimina la empresa y todos sus datos. Se niega si aún tiene empleados:
 * hay que moverlos a otra empresa antes, para no dejar cuentas huérfanas.
 */
export async function deleteCompany(id: number) {
  const staff = await db.query("profiles", { filters: { company_id: id }, select: ["id"], limit: 1 });
  if (staff.count) {
    throw new Error(`La empresa tiene ${staff.count} empleado(s). Muévelos a otra empresa antes de eliminarla.`);
  }
  // Primero las tablas hijas que no llevan company_id.
  const [equipmentIds, mailIds] = await Promise.all([
    db.queryAll<{ id: number }>("equipment", { filters: { company_id: id }, select: ["id"] }),
    db.queryAll<{ id: number }>("internal_mails", { filters: { company_id: id }, select: ["id"] }),
  ]);
  await removeWhereIn("equipment_images", "equipment_id", equipmentIds.map((e) => e.id));
  await removeWhereIn("internal_mailboxes", "mail_id", mailIds.map((m) => m.id));
  for (const table of COMPANY_TABLES) await removeWhere(table, { company_id: id });
  // La empresa va al final: si algo falla a medias, sigue listada y se puede reintentar.
  await db.remove("companies", [id]);
}

// ---------- Perfiles / empleados ----------

export function getProfileByUserId(userId: number) {
  return db.queryOne<Profile>("profiles", { user_id: userId });
}

export function getProfileById(id: number) {
  return db.queryOne<Profile>("profiles", { id });
}

/** Todos los perfiles (admins incluidos), para poner nombre a los fichajes. */
export function listProfiles() {
  return db.queryAll<Profile>("profiles", { order: "full_name" });
}

export function listEmployees(companyId?: number) {
  const filters: Record<string, string | number> = { role: "employee" };
  if (companyId) filters.company_id = companyId;
  return db.queryAll<Profile>("profiles", { filters, order: "full_name" });
}

export async function createEmployee(input: {
  email: string;
  password: string;
  fullName: string;
  companyId: number | null;
  hourlyRate: number | null;
}) {
  const user = await db.createAuthUser(input.email, input.password, { name: input.fullName });
  try {
    const [profile] = await db.insert<Profile>("profiles", [
      {
        user_id: user.id,
        email: user.email,
        full_name: input.fullName,
        role: "employee",
        company_id: input.companyId,
        hourly_rate: input.hourlyRate,
      },
    ]);
    return profile;
  } catch (err) {
    // Sin perfil el usuario no podría entrar: deshacemos la creación.
    await db.deleteAuthUser(user.id).catch(() => {});
    throw err;
  }
}

/** Si el empleado genera factura. Los perfiles anteriores a la columna (sin valor) sí la generan. */
export function generatesInvoice(profile: Pick<Profile, "invoiced">) {
  return profile.invoiced !== false;
}

export function updateProfile(
  id: number,
  values: Partial<
    Pick<
      Profile,
      "full_name" | "company_id" | "active" | "hourly_rate" | "monthly_salary" | "weekly_hours" | "geo_required" | "invoiced" | "avatar_updated_at"
    >
  >,
) {
  return db.update("profiles", id, values);
}

/** Tablas con datos propios de cada usuario (columna user_id = id de la cuenta). */
const USER_TABLES = [
  "time_allocations",
  "time_entries",
  "absences",
  "avatars",
  "goals",
  "billing_profiles",
  "invoice_items",
  "mail_accounts",
  "internal_mailboxes",
  "equipment",
];

/**
 * Elimina al empleado, su cuenta y todos sus datos. Los correos internos que
 * envió se conservan en los buzones de los destinatarios (remitente «—»).
 */
export async function deleteEmployee(profile: Profile) {
  // Primero se le corta el acceso, por si el borrado se queda a medias.
  await db.updateAuthUser(profile.user_id, { is_active: false }).catch(() => {});
  const equipment = await db.queryAll<{ id: number }>("equipment", { filters: { user_id: profile.user_id }, select: ["id"] });
  await removeWhereIn("equipment_images", "equipment_id", equipment.map((e) => e.id));
  for (const table of USER_TABLES) await removeWhere(table, { user_id: profile.user_id });
  await removeWhere("chat_messages", { sender_id: profile.user_id });
  await removeWhere("chat_messages", { recipient_id: profile.user_id });
  await db.deleteAuthUser(profile.user_id).catch((err) => {
    // Ya borrada en un intento anterior.
    if (!(err instanceof db.FdbError && err.status === 404)) throw err;
  });
  // El perfil va al final: si algo falla, sigue listado y se puede reintentar.
  await db.remove("profiles", [profile.id]);
}

export async function setEmployeeActive(profile: Profile, active: boolean) {
  await db.updateAuthUser(profile.user_id, { is_active: active });
  await updateProfile(profile.id, { active });
}

export function setPassword(userId: number, password: string) {
  return db.updateAuthUser(userId, { password });
}

// ---------- Fichajes ----------

/**
 * Autocierre: un fichaje abierto de una empresa con autocierre activo que supera
 * el límite se cierra con salida = entrada + límite y queda marcado. Se aplica
 * cada vez que se leen fichajes, así nunca se muestra uno caducado como abierto.
 */
async function applyAutoClose(entries: TimeEntry[]) {
  if (!entries.some((e) => !e.clock_out)) return entries;
  const companies = new Map((await listCompanies()).map((c) => [c.id, c]));
  const now = Date.now();
  return Promise.all(
    entries.map(async (e) => {
      const company = e.company_id ? companies.get(e.company_id) : undefined;
      if (e.clock_out || !company?.auto_close) return e;
      const limit = new Date(e.clock_in).getTime() + company.auto_close_hours * 3600000;
      if (limit > now) return e;
      const closed = { clock_out: new Date(limit).toISOString(), auto_closed: true };
      await db.update("time_entries", e.id, closed);
      return { ...e, ...closed };
    }),
  );
}

export async function getOpenEntry(userId: number) {
  const rows = await db.queryAll<TimeEntry>("time_entries", { filters: { user_id: userId, clock_out: "is.null" } });
  return (await applyAutoClose(rows)).find((e) => !e.clock_out) ?? null;
}

export async function clockIn(userId: number, companyId: number | null, at: GeoPoint | null = null) {
  if (await getOpenEntry(userId)) throw new Error("Ya tienes una entrada abierta.");
  const [entry] = await db.insert<TimeEntry>("time_entries", [
    {
      user_id: userId,
      company_id: companyId,
      clock_in: new Date().toISOString(),
      ...(at && { in_lat: at.lat, in_lng: at.lng, in_accuracy: at.accuracy }),
    },
  ]);
  return entry;
}

export async function clockOut(userId: number, notes: string | null, at: GeoPoint | null = null) {
  const open = await getOpenEntry(userId);
  if (!open) throw new Error("No tienes ninguna entrada abierta (puede que se haya cerrado automáticamente).");
  return db.update("time_entries", open.id, {
    clock_out: new Date().toISOString(),
    notes,
    ...(at && { out_lat: at.lat, out_lng: at.lng, out_accuracy: at.accuracy }),
  });
}

/** Fichajes de un mes (por empleado o por empresa), ordenados por hora de entrada. */
export async function listMonthEntries(month: Month, by: { userId?: number; companyId?: number }) {
  const filters: Record<string, string | number> = { clock_in: `gte.${monthQueryStart(month)}` };
  if (by.userId) filters.user_id = by.userId;
  if (by.companyId) filters.company_id = by.companyId;
  const rows = await db.queryAll<TimeEntry>("time_entries", { filters, order: "clock_in" });
  return applyAutoClose(rows.filter((e) => inMonth(dayKey(e.clock_in), month)));
}

export function getEntry(id: number) {
  return db.queryOne<TimeEntry>("time_entries", { id });
}

/** Fichajes de un usuario en un día "YYYY-MM-DD" (zona horaria de la app). */
export async function listDayEntries(userId: number, key: string) {
  const [year, month] = key.split("-").map(Number);
  const entries = await listMonthEntries({ year, month }, { userId });
  return entries.filter((e) => dayKey(e.clock_in) === key);
}

/**
 * Guarda un tramo corregido a mano (nuevo si no hay id). Comprueba que no se
 * solape con otros fichajes del usuario, incluido uno abierto.
 */
export async function saveManualEntry(input: {
  id?: number;
  userId: number;
  companyId: number | null;
  clockIn: Date;
  clockOut: Date;
  notes: string | null;
}) {
  const { id, userId, companyId, clockIn, clockOut, notes } = input;
  const now = new Date();
  if (clockOut <= clockIn) throw new Error("La salida debe ser posterior a la entrada.");
  if (clockOut > now) throw new Error("No puedes registrar horas en el futuro.");

  const nearby = await db.queryAll<TimeEntry>("time_entries", {
    filters: { user_id: userId, clock_in: `gte.${new Date(clockIn.getTime() - 86400000).toISOString()}` },
  });
  const overlap = nearby.find((e) => {
    if (e.id === id) return false;
    const start = new Date(e.clock_in);
    const end = e.clock_out ? new Date(e.clock_out) : now;
    return start < clockOut && end > clockIn;
  });
  if (overlap) throw new Error("Ese horario se solapa con otro fichaje de ese día.");

  const values = {
    clock_in: clockIn.toISOString(),
    clock_out: clockOut.toISOString(),
    notes,
    edited: true,
    auto_closed: false,
  };
  if (id) return db.update("time_entries", id, values);
  return db.insert("time_entries", [{ user_id: userId, company_id: companyId, ...values }]);
}

export function deleteEntry(id: number) {
  return db.remove("time_entries", [id]);
}

export async function listOpenEntries(companyId?: number) {
  const filters: Record<string, string | number> = { clock_out: "is.null" };
  if (companyId) filters.company_id = companyId;
  const rows = await db.queryAll<TimeEntry>("time_entries", { filters, order: "clock_in" });
  return (await applyAutoClose(rows)).filter((e) => !e.clock_out);
}

// ---------- Datos de facturación ----------

export type BillingProfile = {
  id: number;
  user_id: number;
  legal_name: string | null;
  tax_id: string | null;
  address: string | null;
  country: string | null;
  service_name: string | null;
  /** Logo como data URL (image/png, jpeg o webp). */
  logo: string | null;
  /** Diseño de la factura y color de acento elegidos por el empleado. */
  invoice_template: InvoiceTemplate | null;
  accent_color: string | null;
};

export const INVOICE_TEMPLATES = {
  classic: "Clásico",
  modern: "Moderno",
  minimal: "Minimalista",
} as const;
export type InvoiceTemplate = keyof typeof INVOICE_TEMPLATES;
export const isInvoiceTemplate = (v: string): v is InvoiceTemplate => v in INVOICE_TEMPLATES;

export type BillingValues = Omit<BillingProfile, "id" | "user_id">;

/** Campos obligatorios para poder emitir una factura, con su nombre visible. */
export const BILLING_FIELDS: [keyof BillingValues, string][] = [
  ["logo", "Logo"],
  ["tax_id", "NIF o CI"],
  ["legal_name", "Nombre"],
  ["address", "Dirección"],
  ["country", "País"],
  ["service_name", "Nombre del servicio"],
];

export function missingBillingFields(billing: BillingProfile | null) {
  return BILLING_FIELDS.filter(([key]) => !billing?.[key]?.trim()).map(([, label]) => label);
}

export function getBillingProfile(userId: number) {
  return db.queryOne<BillingProfile>("billing_profiles", { user_id: userId });
}

export async function saveBillingProfile(userId: number, values: Partial<BillingValues>) {
  const existing = await getBillingProfile(userId);
  if (existing) return db.update("billing_profiles", existing.id, values);
  return db.insert("billing_profiles", [{ user_id: userId, ...values }]);
}

/** user_id de los empleados con logo subido (sin descargar las imágenes). */
export async function listUsersWithLogo() {
  const rows = await db.queryAll<{ user_id: number }>("billing_profiles", {
    filters: { logo: "like.data:image/%" },
    select: ["user_id"],
  });
  return new Set(rows.map((r) => r.user_id));
}

/** Datos de facturación de todos, sin el logo (para listados). */
export function listBillingProfilesWithoutLogo() {
  return db.queryAll<BillingProfile>("billing_profiles", {
    select: ["id", "user_id", "legal_name", "tax_id", "address", "country", "service_name"],
  });
}

// ---------- Objetivos ----------

export type Goal = {
  id: number;
  created_at: string;
  user_id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "pending" | "done";
  completed_at: string | null;
  /** Evidencia al cumplirlo: enlace de YouTube y/o documento (data URL). */
  evidence_url: string | null;
  evidence_file_name: string | null;
  evidence_file_type: string | null;
  evidence_file?: string | null;
};

// En los listados no se descarga el documento adjunto.
const GOAL_COLUMNS = [
  "id", "created_at", "user_id", "title", "description", "due_date", "status",
  "completed_at", "evidence_url", "evidence_file_name", "evidence_file_type",
];

export function listGoals(userId: number) {
  return db.queryAll<Goal>("goals", { filters: { user_id: userId }, select: GOAL_COLUMNS, order: "created_at.desc" });
}

export function getGoal(id: number, withFile = false) {
  return db
    .query<Goal>("goals", { filters: { id }, select: withFile ? undefined : GOAL_COLUMNS, limit: 1 })
    .then((r) => r.data[0] ?? null);
}

export async function createGoal(userId: number, values: { title: string; description: string | null; due_date: string | null }) {
  const [goal] = await db.insert<Goal>("goals", [{ user_id: userId, ...values }]);
  return goal;
}

export function completeGoal(
  id: number,
  evidence: { url: string | null; file: { name: string; type: string; dataUrl: string } | null },
) {
  return db.update("goals", id, {
    status: "done",
    completed_at: new Date().toISOString(),
    evidence_url: evidence.url,
    evidence_file_name: evidence.file?.name ?? null,
    evidence_file_type: evidence.file?.type ?? null,
    evidence_file: evidence.file?.dataUrl ?? null,
  });
}

export function reopenGoal(id: number) {
  return db.update("goals", id, { status: "pending", completed_at: null });
}

export function deleteGoal(id: number) {
  return db.remove("goals", [id]);
}

// ---------- Ausencias ----------

export type Absence = {
  id: number;
  user_id: number;
  day: string;
  type: AbsenceType;
  note: string | null;
};

/** Ausencias de un usuario en un mes, como "YYYY-MM-DD" → ausencia. */
export async function listMonthAbsences(userId: number, month: Month) {
  const prefix = `${month.year}-${String(month.month).padStart(2, "0")}`;
  const rows = await db.queryAll<Absence>("absences", {
    filters: { user_id: userId, day: `gte.${prefix}-01` },
    order: "day",
  });
  return new Map(rows.filter((a) => a.day.startsWith(prefix)).map((a) => [a.day.slice(0, 10), a]));
}

export async function getAbsence(userId: number, day: string) {
  return db.queryOne<Absence>("absences", { user_id: userId, day: `eq.${day}` });
}

/** Marca varios días como ausencia (sustituye la que hubiera en esos días). */
export async function setAbsences(userId: number, days: string[], type: AbsenceType, note: string | null) {
  const existing = await db.queryAll<Absence>("absences", {
    filters: { user_id: userId, day: `in.(${days.join(",")})` },
    select: ["id"],
  });
  if (existing.length) await db.remove("absences", existing.map((a) => a.id));
  return db.insert("absences", days.map((day) => ({ user_id: userId, day, type, note })));
}

export async function removeAbsence(userId: number, day: string) {
  const absence = await getAbsence(userId, day);
  if (absence) await db.remove("absences", [absence.id]);
}

// ---------- Foto de perfil ----------

export async function getAvatar(userId: number) {
  const row = await db.queryOne<{ image: string }>("avatars", { user_id: userId });
  return row?.image ?? null;
}

export async function saveAvatar(profile: Profile, image: string) {
  const existing = await db.queryOne<{ id: number }>("avatars", { user_id: profile.user_id });
  if (existing) await db.update("avatars", existing.id, { image });
  else await db.insert("avatars", [{ user_id: profile.user_id, image }]);
  await updateProfile(profile.id, { avatar_updated_at: new Date().toISOString() });
}

export async function deleteAvatar(profile: Profile) {
  const existing = await db.queryOne<{ id: number }>("avatars", { user_id: profile.user_id });
  if (existing) await db.remove("avatars", [existing.id]);
  await updateProfile(profile.id, { avatar_updated_at: null });
}

// ---------- Enlaces de empresa ----------

export type CompanyLink = {
  id: number;
  company_id: number;
  title: string;
  url: string;
  username: string | null;
  /** Contraseña cifrada con APP_SECRET (ver crypto.ts). */
  password_enc: string | null;
  notes: string | null;
};

export function listCompanyLinks(companyId: number) {
  return db.queryAll<CompanyLink>("company_links", { filters: { company_id: companyId }, order: "title" });
}

export function getCompanyLink(id: number) {
  return db.queryOne<CompanyLink>("company_links", { id });
}

export function createCompanyLink(values: Omit<CompanyLink, "id">) {
  return db.insert("company_links", [values]);
}

export function updateCompanyLink(id: number, values: Partial<Omit<CompanyLink, "id" | "company_id">>) {
  return db.update("company_links", id, values);
}

export function deleteCompanyLink(id: number) {
  return db.remove("company_links", [id]);
}

// ---------- Documentación de empresa ----------

export type DocFolder = { id: number; company_id: number; name: string; parent_id: number | null; color: string | null };

/** Colores disponibles para las carpetas. */
export const FOLDER_COLORS = ["#0f766e", "#0369a1", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#ca8a04", "#475569"];
export type DocFile = {
  id: number;
  created_at: string;
  company_id: number;
  folder_id: number | null;
  name: string;
  type: string | null;
  size: number | null;
  content?: string;
};

export function listDocFolders(companyId: number) {
  return db.queryAll<DocFolder>("doc_folders", { filters: { company_id: companyId }, order: "name" });
}

/** Ficheros de una carpeta (null = raíz), sin el contenido. */
export function listDocFiles(companyId: number, folderId: number | null) {
  return db.queryAll<DocFile>("doc_files", {
    filters: { company_id: companyId, folder_id: folderId === null ? "is.null" : folderId },
    select: ["id", "created_at", "company_id", "folder_id", "name", "type", "size"],
    order: "name",
  });
}

export function getDocFile(id: number, withContent = false) {
  return db
    .query<DocFile>("doc_files", {
      filters: { id },
      select: withContent ? undefined : ["id", "created_at", "company_id", "folder_id", "name", "type", "size"],
      limit: 1,
    })
    .then((r) => r.data[0] ?? null);
}

export function createDocFolder(companyId: number, name: string, parentId: number | null, color: string) {
  return db.insert("doc_folders", [{ company_id: companyId, name, parent_id: parentId, color }]);
}

export function updateDocFolder(id: number, values: Partial<Pick<DocFolder, "color" | "name">>) {
  return db.update("doc_folders", id, values);
}

export function moveDocFileTo(id: number, folderId: number | null) {
  return db.update("doc_files", id, { folder_id: folderId });
}

export function createDocFiles(rows: Omit<DocFile, "id" | "created_at">[]) {
  return db.insert("doc_files", rows);
}

export function deleteDocFile(id: number) {
  return db.remove("doc_files", [id]);
}

export async function deleteDocFolder(folder: DocFolder) {
  const [subfolders, files] = await Promise.all([
    db.query("doc_folders", { filters: { parent_id: folder.id }, limit: 1 }),
    db.query("doc_files", { filters: { folder_id: folder.id }, select: ["id"], limit: 1 }),
  ]);
  if (subfolders.count || files.count) throw new Error("Vacía la carpeta antes de eliminarla.");
  return db.remove("doc_folders", [folder.id]);
}

// ---------- Proyectos, tareas y reparto de horas ----------

export type Project = { id: number; company_id: number; name: string; description: string | null; active: boolean };
export type Task = { id: number; company_id: number; project_id: number; name: string; done: boolean };
export type Allocation = {
  id: number;
  entry_id: number;
  user_id: number;
  company_id: number;
  project_id: number;
  task_id: number | null;
  minutes: number;
  day: string;
};
/** Proyecto activo con sus tareas abiertas, para elegir al repartir horas. */
export type ProjectOption = { id: number; name: string; tasks: { id: number; name: string }[] };

export function listProjects(companyId: number) {
  return db.queryAll<Project>("projects", { filters: { company_id: companyId }, order: "name" });
}

export function listTasks(companyId: number) {
  return db.queryAll<Task>("tasks", { filters: { company_id: companyId }, order: "name" });
}

export async function projectOptions(companyId: number): Promise<ProjectOption[]> {
  const [projects, tasks] = await Promise.all([listProjects(companyId), listTasks(companyId)]);
  return projects
    .filter((p) => p.active)
    .map((p) => ({
      id: p.id,
      name: p.name,
      tasks: tasks.filter((t) => t.project_id === p.id && !t.done).map((t) => ({ id: t.id, name: t.name })),
    }));
}

export function createProject(companyId: number, name: string, description: string | null) {
  return db.insert("projects", [{ company_id: companyId, name, description }]);
}

export function updateProject(id: number, values: Partial<Pick<Project, "name" | "description" | "active">>) {
  return db.update("projects", id, values);
}

export function getProject(id: number) {
  return db.queryOne<Project>("projects", { id });
}

export function getTask(id: number) {
  return db.queryOne<Task>("tasks", { id });
}

export function createTask(project: Project, name: string) {
  return db.insert("tasks", [{ company_id: project.company_id, project_id: project.id, name }]);
}

export function updateTask(id: number, values: Partial<Pick<Task, "name" | "done">>) {
  return db.update("tasks", id, values);
}

export function listEntryAllocations(entryId: number) {
  return db.queryAll<Allocation>("time_allocations", { filters: { entry_id: entryId } });
}

/** Sustituye el reparto de horas de un fichaje. */
export async function setAllocations(
  entry: TimeEntry,
  rows: { project_id: number; task_id: number | null; minutes: number }[],
) {
  const existing = await listEntryAllocations(entry.id);
  if (existing.length) await db.remove("time_allocations", existing.map((a) => a.id));
  if (!rows.length) return;
  await db.insert(
    "time_allocations",
    rows.map((r) => ({
      ...r,
      entry_id: entry.id,
      user_id: entry.user_id,
      company_id: entry.company_id,
      day: dayKey(entry.clock_in),
    })),
  );
}

/** Repartos de horas de un mes (de una empresa, opcionalmente de un usuario). */
export async function listMonthAllocations(companyId: number, month: Month, userId?: number) {
  const prefix = `${month.year}-${String(month.month).padStart(2, "0")}`;
  const filters: Record<string, string | number> = { company_id: companyId, day: `gte.${prefix}-01` };
  if (userId) filters.user_id = userId;
  const rows = await db.queryAll<Allocation>("time_allocations", { filters });
  return rows.filter((a) => a.day.startsWith(prefix));
}

// ---------- Cuentas de correo ----------

export function getMailAccount(userId: number) {
  return db.queryOne<MailAccount>("mail_accounts", { user_id: userId });
}

export function listMailAccounts() {
  return db.queryAll<MailAccount>("mail_accounts", { select: ["id", "user_id", "email_address", "display_name", "imap_host", "smtp_host"] });
}

export async function saveMailAccount(userId: number, values: Omit<MailAccount, "id" | "user_id">) {
  const existing = await getMailAccount(userId);
  if (existing) return db.update("mail_accounts", existing.id, values);
  return db.insert("mail_accounts", [{ user_id: userId, ...values }]);
}

export async function deleteMailAccount(userId: number) {
  const existing = await getMailAccount(userId);
  if (existing) await db.remove("mail_accounts", [existing.id]);
}

// ---------- Conceptos extra de factura ----------

export type InvoiceItem = {
  id: number;
  user_id: number;
  month: string;
  description: string;
  quantity: number;
  unit_price: number;
  added_by: number | null;
};

/** Conceptos de un mes ("YYYY-MM"); de un usuario o de todos. */
export function listInvoiceItems(month: string, userId?: number) {
  return db.queryAll<InvoiceItem>("invoice_items", { filters: { month: `eq.${month}`, ...(userId && { user_id: userId }) }, order: "id" });
}

export function getInvoiceItem(id: number) {
  return db.queryOne<InvoiceItem>("invoice_items", { id });
}

export function addInvoiceItem(values: Omit<InvoiceItem, "id">) {
  return db.insert("invoice_items", [values]);
}

export function deleteInvoiceItem(id: number) {
  return db.remove("invoice_items", [id]);
}

// ---------- Equipamiento asignado ----------

export type Equipment = {
  id: number;
  created_at: string;
  user_id: number;
  company_id: number | null;
  name: string;
  serial_number: string | null;
  assigned_at: string;
  cost: number | null;
  notes: string | null;
  returned_at: string | null;
  assigned_by: number | null;
};

export function listEquipment(userId: number) {
  return db.queryAll<Equipment>("equipment", { filters: { user_id: userId }, order: "assigned_at.desc" });
}

export function getEquipment(id: number) {
  return db.queryOne<Equipment>("equipment", { id });
}

export async function addEquipment(values: Omit<Equipment, "id" | "created_at" | "returned_at">, images: string[]) {
  const [item] = await db.insert<Equipment>("equipment", [values]);
  if (images.length) await db.insert("equipment_images", images.map((image) => ({ equipment_id: item.id, image })));
  return item;
}

export function updateEquipment(id: number, values: Partial<Pick<Equipment, "returned_at">>) {
  return db.update("equipment", id, values);
}

export async function deleteEquipment(id: number) {
  const images = await db.queryAll<{ id: number }>("equipment_images", { filters: { equipment_id: id }, select: ["id"] });
  if (images.length) await db.remove("equipment_images", images.map((i) => i.id));
  await db.remove("equipment", [id]);
}

/** Ids de las fotos de varios equipos (sin descargar las imágenes). */
export async function equipmentImageIds(equipmentIds: number[]) {
  if (!equipmentIds.length) return new Map<number, number[]>();
  const rows = await db.queryAll<{ id: number; equipment_id: number }>("equipment_images", {
    filters: { equipment_id: `in.(${equipmentIds.join(",")})` },
    select: ["id", "equipment_id"],
    order: "id",
  });
  const map = new Map<number, number[]>();
  for (const r of rows) map.set(r.equipment_id, [...(map.get(r.equipment_id) ?? []), r.id]);
  return map;
}

export function getEquipmentImage(id: number) {
  return db.queryOne<{ id: number; equipment_id: number; image: string }>("equipment_images", { id });
}
