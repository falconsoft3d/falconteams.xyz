"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { FdbError, signIn } from "./fdb";
import * as data from "./data";
import { clearSessionCookie, getCurrentUser, requireAdmin, setSessionCookie } from "./session";
import { dayKey, isDayKey, isWeekend, shiftDay, zonedTimeToUtc } from "./time";
import { isAbsenceType } from "./absences";
import { decrypt, encrypt } from "./crypto";
import { isLocale, type Locale } from "./i18n";
import { LOCALE_COOKIE, getT } from "./locale";
import { sendMail, testMailSettings } from "./mail";
import { chatScope, contactsFor, getCompanyAi, saveCompanyAi } from "./chat";
import * as internalMail from "./internal-mail";
import * as db from "./fdb";
import { rateLimited } from "./rate-limit";
import * as recruit from "./recruitment";
import { formatMoney, rateFromSalary } from "./money";

export type FormState = { error?: string; ok?: string } | undefined;

const field = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
const idField = (fd: FormData, name: string) => {
  const n = Number(fd.get(name));
  return Number.isInteger(n) && n > 0 ? n : null;
};
/** Coste por hora del formulario: null si está vacío, error si no es válido. */
const rateField = (fd: FormData) => {
  const raw = field(fd, "hourly_rate").replace(",", ".");
  if (!raw) return null;
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100000) throw new Error("El coste por hora no es válido.");
  return Math.round(rate * 100) / 100;
};
const message = (err: unknown) => (err instanceof Error ? err.message : "Ha ocurrido un error.");

/**
 * Devuelve el error al formulario. refresh() hace que Next.js vuelva a renderizar
 * la página con normalidad; sin él, los envíos sin JavaScript fallan al leer cookies.
 */
function failed(err: unknown): FormState {
  refresh();
  return { error: message(err) };
}

// Imágenes subidas (logo de facturación y foto de perfil).
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX_BYTES = 300 * 1024;

// ---------- Sesión ----------

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  refresh();
}


/** Error del login: con refresh() para que el render posterior lea bien las cookies. */
function loginError(error: string): FormState {
  refresh();
  return { error };
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  const email = field(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const slug = field(fd, "company");
  if (!email || !password) return loginError(t("login.errMissing"));

  let session;
  try {
    session = await signIn(email, password);
  } catch (err) {
    if (err instanceof FdbError && err.status === 401) return loginError(t("login.errWrong"));
    return failed(err);
  }

  const profile = await data.getProfileByUserId(session.user.id);
  if (!profile || !profile.active) return loginError(t("login.errNoAccess"));

  let destination = "/admin";
  if (slug) {
    const company = await data.getCompanyBySlug(slug);
    if (!company || !company.active) return loginError(t("login.errCompany"));
    if (profile.role !== "admin" && profile.company_id !== company.id) {
      return loginError(t("login.errNotMember"));
    }
    destination = `/${company.slug}`;
  } else if (profile.role !== "admin") {
    const company = profile.company_id ? await data.getCompanyById(profile.company_id) : null;
    if (!company || !company.active) {
      return loginError(t("login.errNoActiveCompany"));
    }
    destination = `/${company.slug}`;
  }

  await setSessionCookie(session.token, session.expires_in);
  redirect(destination);
}

export async function logout(fd: FormData) {
  const slug = field(fd, "company");
  await clearSessionCookie();
  redirect(slug ? `/${slug}/login` : "/login");
}

// ---------- Fichajes ----------

/**
 * Quién ficha y para qué empresa. Los empleados solo desde su empresa activa;
 * el admin ficha desde su panel y sus fichajes no pertenecen a ninguna empresa.
 */
async function clockingUser(slug: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
  if (user.role === "admin") return { user, companyId: null };
  if (!user.company?.active || user.company.slug !== slug) {
    throw new Error("Solo los empleados de esta empresa pueden fichar aquí.");
  }
  return { user, companyId: user.company.id };
}

/** Ubicación enviada por el navegador al fichar; obligatoria si el admin la exige. */
function geoField(fd: FormData, required: boolean): data.GeoPoint | null {
  const lat = Number(fd.get("lat"));
  const lng = Number(fd.get("lng"));
  const accuracy = Number(fd.get("accuracy"));
  const valid = fd.get("lat") !== null && fd.get("lng") !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  if (!valid) {
    if (required) throw new Error("Debes permitir el acceso a tu ubicación para fichar.");
    return null;
  }
  return { lat, lng, accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null };
}

export async function clockIn(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user, companyId } = await clockingUser(field(fd, "company"));
    await data.clockIn(user.userId, companyId, geoField(fd, user.geoRequired));
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: (await getT())("clock.clockedIn") };
}

export async function clockOut(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user, companyId } = await clockingUser(field(fd, "company"));
    const open = await data.getOpenEntry(user.userId);
    // El reparto se valida antes de cerrar, contra la duración hasta ahora.
    const allocations = companyId && open ? await allocationsField(fd, companyId, Date.now() - Date.parse(open.clock_in)) : [];
    const notes = field(fd, "notes").slice(0, 2000);
    await data.clockOut(user.userId, notes || null, geoField(fd, user.geoRequired));
    if (open && allocations.length) await data.setAllocations(open, allocations);
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: (await getT())("clock.clockedOut") };
}

// ---------- Reparto de horas en proyectos ----------

/** Duración escrita como "1:30", "1,5" o "2" → minutos. */
function parseMinutes(raw: string) {
  const value = raw.trim().replace(",", ".");
  if (/^\d{1,2}:[0-5]\d$/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  }
  if (/^\d+(\.\d+)?$/.test(value)) return Math.round(Number(value) * 60);
  throw new Error(`«${raw}» no es una duración válida (usa 1:30 o 1,5).`);
}

/**
 * Filas de reparto del formulario (alloc_project / alloc_task / alloc_time).
 * Las filas sin proyecto o sin tiempo se ignoran; el total no puede superar lo trabajado.
 */
async function allocationsField(fd: FormData, companyId: number, workedMs: number) {
  const projects = fd.getAll("alloc_project").map(String);
  const tasks = fd.getAll("alloc_task").map(String);
  const times = fd.getAll("alloc_time").map(String);
  const rows: { project_id: number; task_id: number | null; minutes: number }[] = [];
  let options: data.ProjectOption[] | null = null;
  for (let i = 0; i < projects.length; i++) {
    if (!projects[i] || !times[i]?.trim()) continue;
    options ??= await data.projectOptions(companyId);
    const project = options.find((p) => p.id === Number(projects[i]));
    if (!project) throw new Error("Proyecto no válido.");
    const taskId = tasks[i] ? Number(tasks[i]) : null;
    if (taskId && !project.tasks.some((t) => t.id === taskId)) throw new Error("Tarea no válida.");
    const minutes = parseMinutes(times[i]);
    if (minutes > 0) rows.push({ project_id: project.id, task_id: taskId, minutes });
  }
  const total = rows.reduce((sum, r) => sum + r.minutes, 0);
  const worked = Math.floor(workedMs / 60000);
  if (total > worked + 1) {
    throw new Error(`Has repartido ${Math.floor(total / 60)} h ${total % 60} min, más de lo trabajado (${Math.floor(worked / 60)} h ${worked % 60} min).`);
  }
  return rows;
}

/** Reparte (o vuelve a repartir) un fichaje cerrado entre proyectos y tareas. */
export async function saveEntryAllocations(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user } = await clockingUser(field(fd, "company"));
    const entry = await ownClosedEntry(fd, user.userId);
    if (!entry.company_id) throw new Error("Este fichaje no pertenece a ninguna empresa.");
    const rows = await allocationsField(fd, entry.company_id, Date.parse(entry.clock_out!) - Date.parse(entry.clock_in));
    await data.setAllocations(entry, rows);
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Reparto guardado." };
}

// ---------- Ajuste manual de horas ----------

const timeField = (fd: FormData, name: string) => {
  const value = field(fd, name);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("Indica las horas en formato HH:MM.");
  return value;
};

/** Fichaje del usuario actual que se puede ajustar (cerrado y suyo). */
async function ownClosedEntry(fd: FormData, userId: number) {
  const id = idField(fd, "entry_id");
  const entry = id ? await data.getEntry(id) : null;
  if (!entry || entry.user_id !== userId) throw new Error("Fichaje no encontrado.");
  if (!entry.clock_out) throw new Error("Registra primero la salida de este fichaje desde tu panel.");
  return entry;
}

export async function saveDayEntry(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user, companyId } = await clockingUser(field(fd, "company"));
    const entry = idField(fd, "entry_id") ? await ownClosedEntry(fd, user.userId) : null;
    // El día sale del fichaje existente, o del formulario si es un tramo nuevo.
    const key = entry ? dayKey(entry.clock_in) : field(fd, "day");
    if (!isDayKey(key)) throw new Error("Día no válido.");
    await data.saveManualEntry({
      id: entry?.id,
      userId: user.userId,
      companyId: entry ? entry.company_id : companyId,
      clockIn: zonedTimeToUtc(key, timeField(fd, "clock_in")),
      clockOut: zonedTimeToUtc(key, timeField(fd, "clock_out")),
      notes: field(fd, "notes").slice(0, 2000) || null,
    });
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Horas guardadas." };
}

export async function deleteDayEntry(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user } = await clockingUser(field(fd, "company"));
    const entry = await ownClosedEntry(fd, user.userId);
    await data.deleteEntry(entry.id);
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Fichaje eliminado." };
}

// ---------- Ausencias ----------

export async function markAbsence(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user } = await clockingUser(field(fd, "company"));
    const from = field(fd, "day");
    const until = field(fd, "until") || from;
    const type = field(fd, "type");
    if (!isDayKey(from) || !isDayKey(until) || until < from) throw new Error("Revisa las fechas.");
    if (!isAbsenceType(type)) throw new Error("Elige el tipo de ausencia.");
    // En un rango se marcan solo los días laborables; un día suelto se marca siempre.
    const days: string[] = [];
    for (let d = from; d <= until; d = shiftDay(d, 1)) {
      if (from === until || !isWeekend(d)) days.push(d);
      if (days.length > 92) throw new Error("Marca como máximo 3 meses de una vez.");
    }
    if (!days.length) throw new Error("El rango no tiene días laborables.");
    await data.setAbsences(user.userId, days, type, field(fd, "note").slice(0, 500) || null);
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Ausencia guardada." };
}

export async function clearAbsence(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user } = await clockingUser(field(fd, "company"));
    const day = field(fd, "day");
    if (!isDayKey(day)) throw new Error("Día no válido.");
    await data.removeAbsence(user.userId, day);
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Ausencia eliminada." };
}

// ---------- Mi perfil ----------

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
    const current = String(fd.get("current_password") ?? "");
    const next = String(fd.get("new_password") ?? "");
    if (next.length < 8) throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
    if (next !== String(fd.get("confirm_password") ?? "")) throw new Error("Las contraseñas nuevas no coinciden.");
    if (next === current) throw new Error("La nueva contraseña debe ser distinta de la actual.");
    try {
      await signIn(user.email, current);
    } catch {
      throw new Error("La contraseña actual no es correcta.");
    }
    await data.setPassword(user.userId, next);
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Contraseña cambiada." };
}

export async function updateAvatar(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    const profile = user ? await data.getProfileById(user.profileId) : null;
    if (!profile) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
    if (field(fd, "remove") === "1") {
      await data.deleteAvatar(profile);
    } else {
      const image = fd.get("avatar");
      if (!(image instanceof File) || image.size === 0) throw new Error("Elige una imagen.");
      if (!LOGO_TYPES.includes(image.type)) throw new Error("La foto debe ser PNG, JPG o WebP.");
      if (image.size > LOGO_MAX_BYTES) throw new Error("La foto no puede pesar más de 300 KB.");
      await data.saveAvatar(profile, `data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`);
    }
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Foto actualizada." };
}

// ---------- Facturación (empleado) ----------


export async function saveBilling(_: FormState, fd: FormData): Promise<FormState> {
  const slug = field(fd, "company");
  const invoiceMonth = field(fd, "invoice");
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "employee" || user.company?.slug !== slug) {
      throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
    }
    const values: Partial<data.BillingValues> = {
      legal_name: field(fd, "legal_name").slice(0, 200),
      tax_id: field(fd, "tax_id").slice(0, 50),
      address: field(fd, "address").slice(0, 500),
      country: field(fd, "country").slice(0, 100),
      service_name: field(fd, "service_name").slice(0, 200),
    };
    const template = field(fd, "invoice_template");
    if (template) {
      if (!data.isInvoiceTemplate(template)) throw new Error("Diseño de factura no válido.");
      values.invoice_template = template;
    }
    const accent = field(fd, "accent_color");
    if (accent) {
      if (!/^#[0-9a-f]{6}$/i.test(accent)) throw new Error("Color no válido.");
      values.accent_color = accent.toLowerCase();
    }
    const logo = fd.get("logo");
    if (logo instanceof File && logo.size > 0) {
      if (!LOGO_TYPES.includes(logo.type)) throw new Error("El logo debe ser una imagen PNG, JPG o WebP.");
      if (logo.size > LOGO_MAX_BYTES) throw new Error("El logo no puede pesar más de 300 KB.");
      values.logo = `data:${logo.type};base64,${Buffer.from(await logo.arrayBuffer()).toString("base64")}`;
    }
    await data.saveBillingProfile(user.userId, values);
    const missing = data.missingBillingFields(await data.getBillingProfile(user.userId));
    if (missing.length) return failed(new Error(`Datos guardados. Para facturar falta: ${missing.join(", ")}.`));
  } catch (err) {
    return failed(err);
  }
  // Si venía de "Generar factura", vuelve a la factura una vez completo el perfil.
  if (/^\d{4}-\d{2}$/.test(invoiceMonth)) redirect(`/${slug}/invoice?month=${invoiceMonth}`);
  refresh();
  return { ok: "Datos de facturación guardados." };
}

// ---------- Objetivos ----------

const EVIDENCE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "text/plain",
  "image/png",
  "image/jpeg",
]);
const EVIDENCE_MAX_BYTES = 2 * 1024 * 1024;

/** Enlace de YouTube validado, o null si el campo viene vacío. */
function youtubeField(fd: FormData) {
  const raw = field(fd, "evidence_url");
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("El enlace no es válido.");
  }
  const host = url.hostname.replace(/^(www|m)\./, "");
  if (!["http:", "https:"].includes(url.protocol) || !["youtube.com", "youtu.be"].includes(host)) {
    throw new Error("El enlace debe ser de YouTube (youtube.com o youtu.be).");
  }
  return url.toString();
}

export async function completeGoal(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
    const id = idField(fd, "goal_id");
    const goal = id ? await data.getGoal(id) : null;
    if (!goal || goal.user_id !== user.userId) throw new Error("Objetivo no encontrado.");
    if (goal.status === "done") throw new Error("Este objetivo ya está cumplido.");

    const url = youtubeField(fd);
    let file = null;
    const upload = fd.get("evidence_file");
    if (upload instanceof File && upload.size > 0) {
      if (!EVIDENCE_TYPES.has(upload.type)) throw new Error("Formato no admitido: sube un PDF, documento de Office/LibreOffice, texto o imagen.");
      if (upload.size > EVIDENCE_MAX_BYTES) throw new Error("El documento no puede pesar más de 2 MB.");
      const dataUrl = `data:${upload.type};base64,${Buffer.from(await upload.arrayBuffer()).toString("base64")}`;
      file = { name: upload.name.slice(0, 200), type: upload.type, dataUrl };
    }
    if (!url && !file) throw new Error("Para marcarlo como cumplido adjunta un documento o un enlace de YouTube.");
    await data.completeGoal(goal.id, { url, file });
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "¡Objetivo cumplido!" };
}

export async function createGoal(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const profile = await employeeProfile(fd);
    const title = field(fd, "title").slice(0, 200);
    const dueDate = field(fd, "due_date");
    if (!title) throw new Error("El objetivo necesita un título.");
    if (dueDate && !isDayKey(dueDate)) throw new Error("La fecha límite no es válida.");
    await data.createGoal(profile.user_id, {
      title,
      description: field(fd, "description").slice(0, 2000) || null,
      due_date: dueDate || null,
    });
    return "Objetivo asignado.";
  });
}

async function goalOf(fd: FormData) {
  const id = idField(fd, "goal_id");
  const goal = id ? await data.getGoal(id) : null;
  if (!goal) throw new Error("Objetivo no encontrado.");
  return goal;
}

export async function reopenGoal(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    await data.reopenGoal((await goalOf(fd)).id);
  });
}

export async function deleteGoal(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    await data.deleteGoal((await goalOf(fd)).id);
  });
}

// ---------- Enlaces y documentación de empresa ----------

const DOC_MAX_BYTES = 2 * 1024 * 1024;

/** URL http(s) válida o error. */
function urlField(fd: FormData, name: string) {
  const raw = field(fd, name);
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {}
  throw new Error("La URL debe empezar por http:// o https://");
}

async function companyOf(fd: FormData) {
  const id = idField(fd, "company_id");
  const company = id ? await data.getCompanyById(id) : null;
  if (!company) throw new Error("Empresa no válida.");
  return company;
}

/** Descifra la contraseña de un enlace para un miembro de su empresa (botón «Mostrar»/«Copiar»). */
export async function revealLinkPassword(linkId: number): Promise<{ password?: string; error?: string }> {
  const user = await getCurrentUser();
  const link = Number.isInteger(linkId) ? await data.getCompanyLink(linkId) : null;
  if (!user || !link) return { error: "No disponible." };
  const company = await data.getCompanyById(link.company_id);
  const member = user.role === "admin" || (user.company?.id === link.company_id && company?.active);
  if (!member || !link.password_enc) return { error: "No disponible." };
  return { password: decrypt(link.password_enc) };
}

export async function saveCompanyLink(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const title = field(fd, "title").slice(0, 200);
    if (!title) throw new Error("El enlace necesita un nombre.");
    const values = {
      title,
      url: urlField(fd, "url"),
      username: field(fd, "username").slice(0, 200) || null,
      notes: field(fd, "notes").slice(0, 1000) || null,
    };
    const password = String(fd.get("password") ?? "");
    const linkId = idField(fd, "link_id");
    if (linkId) {
      // Al editar, la contraseña vacía conserva la actual.
      await data.updateCompanyLink(linkId, { ...values, ...(password && { password_enc: encrypt(password) }) });
      return "Enlace actualizado.";
    }
    const company = await companyOf(fd);
    await data.createCompanyLink({ company_id: company.id, ...values, password_enc: password ? encrypt(password) : null });
    return "Enlace añadido.";
  });
}

export async function removeCompanyLink(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "link_id");
    if (!id) throw new Error("Enlace no válido.");
    await data.deleteCompanyLink(id);
  });
}

async function folderIn(companyId: number, folderId: number | null) {
  if (folderId === null) return null;
  const folder = (await data.listDocFolders(companyId)).find((f) => f.id === folderId);
  if (!folder) throw new Error("Carpeta no válida.");
  return folder;
}

export async function createFolder(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const company = await companyOf(fd);
    const name = field(fd, "name").replace(/[\/]/g, "-").slice(0, 120);
    if (!name) throw new Error("La carpeta necesita un nombre.");
    const parent = await folderIn(company.id, idField(fd, "folder_id"));
    const color = data.FOLDER_COLORS.includes(field(fd, "color")) ? field(fd, "color") : data.FOLDER_COLORS[0];
    await data.createDocFolder(company.id, name, parent?.id ?? null, color);
    return "Carpeta creada.";
  });
}

export async function uploadDocs(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const company = await companyOf(fd);
    const folder = await folderIn(company.id, idField(fd, "folder_id"));
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new Error("Elige al menos un fichero.");
    const tooBig = files.find((f) => f.size > DOC_MAX_BYTES);
    if (tooBig) throw new Error(`«${tooBig.name}» pesa más de 2 MB.`);
    const rows = await Promise.all(
      files.map(async (f) => ({
        company_id: company.id,
        folder_id: folder?.id ?? null,
        name: f.name.slice(0, 200),
        type: f.type || "application/octet-stream",
        size: f.size,
        content: `data:${f.type || "application/octet-stream"};base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`,
      })),
    );
    await data.createDocFiles(rows);
    return files.length === 1 ? "Fichero subido." : `${files.length} ficheros subidos.`;
  });
}

export async function setFolderColor(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const company = await companyOf(fd);
    const folder = await folderIn(company.id, idField(fd, "target_folder"));
    const color = field(fd, "color");
    if (!folder || !data.FOLDER_COLORS.includes(color)) throw new Error("Color no válido.");
    await data.updateDocFolder(folder.id, { color });
  });
}

/** Mover un fichero a otra carpeta (arrastrar y soltar). folderId null = raíz. */
export async function moveDocFile(fileId: number, folderId: number | null): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "No autorizado." };
  try {
    const file = Number.isInteger(fileId) ? await data.getDocFile(fileId) : null;
    if (!file) throw new Error("Fichero no encontrado.");
    const folder = await folderIn(file.company_id, folderId);
    if (folder?.id === file.folder_id || (!folder && file.folder_id === null)) return {};
    await data.moveDocFileTo(file.id, folder?.id ?? null);
  } catch (err) {
    return { error: message(err) };
  }
  refresh();
  return {};
}

export async function removeDocFile(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "file_id");
    if (!id) throw new Error("Fichero no válido.");
    await data.deleteDocFile(id);
  });
}

export async function removeDocFolder(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const company = await companyOf(fd);
    const folder = await folderIn(company.id, idField(fd, "folder_id"));
    if (!folder) throw new Error("Carpeta no válida.");
    await data.deleteDocFolder(folder);
  });
}

// ---------- Proyectos (admin) ----------

export async function saveProject(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const company = await companyOf(fd);
    const name = field(fd, "name").slice(0, 200);
    if (!name) throw new Error("El proyecto necesita un nombre.");
    await data.createProject(company.id, name, field(fd, "description").slice(0, 2000) || null);
    return "Proyecto creado.";
  });
}

export async function setProjectActive(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "project_id");
    if (!id || !(await data.getProject(id))) throw new Error("Proyecto no válido.");
    await data.updateProject(id, { active: field(fd, "active") === "true" });
  });
}

export async function addTask(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "project_id");
    const project = id ? await data.getProject(id) : null;
    if (!project) throw new Error("Proyecto no válido.");
    const name = field(fd, "name").slice(0, 200);
    if (!name) throw new Error("La tarea necesita un nombre.");
    await data.createTask(project, name);
  });
}

export async function setTaskDone(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "task_id");
    if (!id || !(await data.getTask(id))) throw new Error("Tarea no válida.");
    await data.updateTask(id, { done: field(fd, "done") === "true" });
  });
}

// ---------- Correo ----------

/**
 * Usuario cuyo buzón se configura: el propio, o el empleado indicado si quien
 * actúa es admin.
 */
async function mailboxOwner(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
  const profileId = idField(fd, "profile_id");
  if (!profileId || profileId === user.profileId) return user.userId;
  if (user.role !== "admin") throw new Error("Solo puedes configurar tu propio buzón.");
  const profile = await data.getProfileById(profileId);
  if (!profile) throw new Error("Usuario no válido.");
  return profile.user_id;
}

const portField = (fd: FormData, name: string) => {
  const port = Number(field(fd, name));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Puerto no válido.");
  return port;
};

export async function saveMailSettings(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const userId = await mailboxOwner(fd);
    const existing = await data.getMailAccount(userId);
    const email = field(fd, "email_address").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El email no es válido.");
    const server = (kind: "imap" | "smtp") => {
      const pass = String(fd.get(`${kind}_pass`) ?? "");
      const stored = existing?.[`${kind}_pass_enc`];
      if (!pass && !stored) throw new Error(`Falta la contraseña ${kind.toUpperCase()}.`);
      return {
        host: field(fd, `${kind}_host`).toLowerCase(),
        port: portField(fd, `${kind}_port`),
        secure: fd.get(`${kind}_secure`) === "on",
        user: field(fd, `${kind}_user`) || email,
        pass: pass || decrypt(stored!),
      };
    };
    const imap = server("imap");
    const smtp = server("smtp");
    await testMailSettings(imap, smtp);
    await data.saveMailAccount(userId, {
      email_address: email,
      display_name: field(fd, "display_name").slice(0, 120) || null,
      imap_host: imap.host,
      imap_port: imap.port,
      imap_secure: imap.secure,
      imap_user: imap.user,
      imap_pass_enc: encrypt(imap.pass),
      smtp_host: smtp.host,
      smtp_port: smtp.port,
      smtp_secure: smtp.secure,
      smtp_user: smtp.user,
      smtp_pass_enc: encrypt(smtp.pass),
    });
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Conexión comprobada y buzón guardado." };
}

export async function removeMailSettings(_: FormState, fd: FormData): Promise<FormState> {
  try {
    await data.deleteMailAccount(await mailboxOwner(fd));
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Buzón desconectado." };
}

/** Envía un correo desde el buzón propio (nadie envía desde el buzón de otro). */
export async function sendMailAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    const account = user ? await data.getMailAccount(user.userId) : null;
    if (!account) throw new Error("Configura primero tu buzón.");
    const to = field(fd, "to");
    if (!to) throw new Error("Indica al menos un destinatario.");
    const subject = field(fd, "subject").slice(0, 300);
    await sendMail(account, {
      to,
      cc: field(fd, "cc") || undefined,
      subject: subject || "(sin asunto)",
      text: String(fd.get("body") ?? ""),
      inReplyTo: field(fd, "in_reply_to") || undefined,
    });
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Correo enviado." };
}

// ---------- Agente IA del chat ----------

export async function saveAiSettings(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const company = await companyOf(fd);
    const existing = await getCompanyAi(company.id);
    const apiKey = String(fd.get("api_key") ?? "").trim();
    const enabled = fd.get("enabled") === "on";
    if (enabled && !apiKey && !existing?.api_key_enc) throw new Error("Pega el token (API key) de OpenAI para activar el agente.");
    await saveCompanyAi(company.id, {
      enabled,
      model: field(fd, "model") || "gpt-4o-mini",
      system_prompt: String(fd.get("system_prompt") ?? "").trim().slice(0, 4000) || null,
      ...(apiKey && { api_key_enc: encrypt(apiKey) }),
    });
    return enabled ? "Agente IA activado." : "Agente IA guardado (desactivado).";
  });
}

// ---------- Reclutamiento (admin) ----------

export async function saveOffer(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const company = await companyOf(fd);
    const title = field(fd, "title").slice(0, 200);
    const description = String(fd.get("description") ?? "").trim().slice(0, 8000);
    if (!title || !description) throw new Error("La oferta necesita título y descripción.");
    const values: Parameters<typeof recruit.updateOffer>[1] = {
      title,
      description,
      location: field(fd, "location").slice(0, 200) || null,
      modality: field(fd, "modality").slice(0, 100) || null,
      employment_type: field(fd, "employment_type").slice(0, 100) || null,
      salary: field(fd, "salary").slice(0, 200) || null,
    };
    // Imagen de portada: nueva (hasta 1 MB) o quitar la actual.
    const image = fd.get("image");
    if (image instanceof File && image.size > 0) {
      if (!LOGO_TYPES.includes(image.type)) throw new Error("La imagen debe ser PNG, JPG o WebP.");
      if (image.size > 1024 * 1024) throw new Error("La imagen no puede pesar más de 1 MB.");
      values.image = `data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`;
      values.image_updated_at = new Date().toISOString();
    } else if (fd.get("remove_image") === "on") {
      values.image = null;
      values.image_updated_at = null;
    }
    const offerId = idField(fd, "offer_id");
    if (offerId) {
      await recruit.updateOffer(offerId, values);
      return "Oferta actualizada.";
    }
    await recruit.createOffer({ ...values, company_id: company.id } as Parameters<typeof recruit.createOffer>[0]);
    return "Oferta publicada.";
  });
}

export async function setOfferOpen(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "offer_id");
    if (!id || !(await recruit.getOffer(id))) throw new Error("Oferta no válida.");
    await recruit.updateOffer(id, { open: field(fd, "open") === "true" });
  });
}

export async function addRecruitQuestion(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const company = await companyOf(fd);
    const question = field(fd, "question").slice(0, 500);
    if (!question) throw new Error("Escribe la pregunta.");
    if ((await recruit.listCompanyQuestions(company.id)).length >= recruit.MAX_COMPANY_QUESTIONS) {
      throw new Error(`Máximo ${recruit.MAX_COMPANY_QUESTIONS} preguntas propias por empresa.`);
    }
    await recruit.addCompanyQuestion(company.id, question);
  });
}

export async function removeRecruitQuestion(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "question_id");
    if (!id) throw new Error("Pregunta no válida.");
    await recruit.deleteCompanyQuestion(id);
  });
}

export async function setApplicationStage(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "application_id");
    const stage = field(fd, "stage");
    if (!id || !recruit.isStage(stage)) throw new Error("Etapa no válida.");
    await recruit.updateApplication(id, { stage });
    return "Etapa actualizada.";
  });
}

export async function reevaluateApplication(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "application_id");
    const app = id ? await recruit.getApplication(id) : null;
    if (!app || app.status === "questions") throw new Error("El candidato aún no ha enviado sus respuestas.");
    const [offer, company] = await Promise.all([recruit.getOffer(app.offer_id), data.getCompanyById(app.company_id)]);
    if (!offer || !company) throw new Error("Oferta no válida.");
    const { score } = await recruit.evaluateApplication(app, offer, company);
    return `Evaluado con la IA: ${score}/100.`;
  });
}

/** Botón «Redactar con IA» del formulario de oferta: devuelve el texto propuesto. */
export async function draftOfferDescriptionAction(input: {
  companyId: number;
  title: string;
  description: string;
  location?: string;
  modality?: string;
  employment_type?: string;
  salary?: string;
}): Promise<{ text?: string; error?: string }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "No autorizado." };
  const title = String(input.title ?? "").trim().slice(0, 200);
  if (!title) return { error: "Escribe primero el título del puesto." };
  const company = Number.isInteger(input.companyId) ? await data.getCompanyById(input.companyId) : null;
  if (!company) return { error: "Empresa no válida." };
  try {
    const text = await recruit.draftOfferDescription(company, {
      title,
      description: String(input.description ?? "").slice(0, 8000),
      location: String(input.location ?? "").slice(0, 200),
      modality: String(input.modality ?? "").slice(0, 100),
      employment_type: String(input.employment_type ?? "").slice(0, 100),
      salary: String(input.salary ?? "").slice(0, 200),
    });
    return { text: text.slice(0, 8000) };
  } catch (err) {
    return { error: message(err) };
  }
}

// ---------- Reclutamiento (público) ----------

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function applyToOffer(_: FormState, fd: FormData): Promise<FormState> {
  let token: string;
  try {
    // Campo trampa: los bots lo rellenan, las personas no lo ven.
    if (field(fd, "website")) throw new Error("No se pudo enviar la candidatura.");
    if (rateLimited(`apply:${await clientIp()}`, 5, 60 * 60 * 1000)) {
      throw new Error("Has enviado demasiadas candidaturas. Inténtalo más tarde.");
    }
    const offerId = idField(fd, "offer_id");
    const offer = offerId ? await recruit.getOffer(offerId) : null;
    const company = offer ? await data.getCompanyById(offer.company_id) : null;
    if (!offer || !offer.open || !company?.active) throw new Error("Esta oferta ya no está disponible.");

    const name = field(fd, "name").slice(0, 120);
    const email = field(fd, "email").toLowerCase().slice(0, 200);
    if (!name) throw new Error("Escribe tu nombre.");
    const country = field(fd, "country").slice(0, 100);
    const city = field(fd, "city").slice(0, 100);
    if (!country || !city) throw new Error("Indica tu país y tu ciudad.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El email no es válido.");
    const link = field(fd, "link").slice(0, 500);
    if (link && !/^https?:\/\//i.test(link)) throw new Error("El enlace debe empezar por http:// o https://");

    const existing = await recruit.findApplication(offer.id, email);
    if (existing) {
      if (existing.status !== "questions") throw new Error("Ya te has postulado a esta oferta con este email.");
      token = existing.token;
    } else {
      const questions = await recruit.buildQuestionnaire(offer, company);
      token = recruit.newToken();
      await db.insert("job_applications", [
        {
          offer_id: offer.id,
          company_id: company.id,
          token,
          name,
          email,
          phone: field(fd, "phone").slice(0, 50) || null,
          country,
          city,
          link: link || null,
          about: String(fd.get("about") ?? "").trim().slice(0, 3000) || null,
          questions,
          answers: [],
          // Sin preguntas (empresa sin preguntas ni IA) la candidatura queda enviada.
          status: questions.length ? "questions" : "submitted",
          submitted_at: questions.length ? null : new Date().toISOString(),
        },
      ]);
    }
  } catch (err) {
    return failed(err);
  }
  redirect(`/jobs/apply/${token}`);
}

export async function submitAnswers(_: FormState, fd: FormData): Promise<FormState> {
  const token = field(fd, "token");
  try {
    const app = await recruit.getApplicationByToken(token);
    if (!app) throw new Error("Candidatura no encontrada.");
    if (app.status !== "questions") throw new Error("Ya enviaste tus respuestas. ¡Gracias!");
    const questions = app.questions ?? [];
    const answers = questions.map((_, i) => String(fd.get(`answer_${i}`) ?? "").trim().slice(0, 4000));
    const empty = answers.filter((a) => !a).length;
    if (empty) throw new Error(`Te falta${empty === 1 ? "" : "n"} ${empty} respuesta${empty === 1 ? "" : "s"}.`);
    await recruit.updateApplication(app.id, { answers, status: "submitted", submitted_at: new Date().toISOString() });

    // Evaluación automática si la empresa tiene la IA activa; si falla, queda pendiente.
    const [offer, company] = await Promise.all([recruit.getOffer(app.offer_id), data.getCompanyById(app.company_id)]);
    if (offer && company) await recruit.evaluateApplication({ ...app, answers }, offer, company).catch(() => {});
  } catch (err) {
    return failed(err);
  }
  redirect(`/jobs/apply/${token}`);
}

// ---------- Correo interno ----------

export async function sendInternalMailAction(_: FormState, fd: FormData): Promise<FormState> {
  const slug = field(fd, "company");
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
    const company = await chatScope(user, slug);
    if (company === undefined) throw new Error("No autorizado.");
    const contacts = await contactsFor(user, company);
    const ids = [...new Set(fd.getAll("to").map(Number))];
    const recipients = contacts.filter((c) => ids.includes(c.user_id));
    if (!recipients.length || recipients.length !== ids.length) throw new Error("Elige al menos un destinatario válido.");
    const subject = field(fd, "subject").slice(0, 200);
    const body = String(fd.get("body") ?? "").trim().slice(0, 20000);
    if (!subject || !body) throw new Error("Escribe el asunto y el mensaje.");
    await internalMail.sendInternalMail({
      companyId: company?.id ?? null,
      senderId: user.userId,
      recipientIds: recipients.map((r) => r.user_id),
      toNames: recipients.map((r) => r.full_name || r.email).join(", "),
      subject,
      body,
      replyToId: idField(fd, "reply_to"),
    });
  } catch (err) {
    return failed(err);
  }
  redirect(`/${slug}/inbox?folder=sent&sent=1`);
}

export async function deleteInternalMailAction(_: FormState, fd: FormData): Promise<FormState> {
  const slug = field(fd, "company");
  try {
    const user = await getCurrentUser();
    const boxId = idField(fd, "box_id");
    if (!user || !boxId) throw new Error("Mensaje no encontrado.");
    await internalMail.removeFromMailbox(user.userId, boxId);
  } catch (err) {
    return failed(err);
  }
  redirect(`/${slug}/inbox`);
}

// ---------- Contacto ----------

export async function sendContactMessage(_: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  try {
    if (field(fd, "website")) throw new Error("No se pudo enviar el mensaje.");
    if (rateLimited(`contact:${await clientIp()}`, 5, 60 * 60 * 1000)) throw new Error("Has enviado demasiados mensajes. Inténtalo más tarde.");
    const name = field(fd, "name").slice(0, 120);
    const email = field(fd, "email").toLowerCase().slice(0, 200);
    const message = String(fd.get("message") ?? "").trim().slice(0, 5000);
    if (!name || !message) throw new Error("Escribe tu nombre y tu mensaje.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El email no es válido.");
    await db.insert("contact_messages", [{ name, email, company: field(fd, "company").slice(0, 200) || null, message }]);
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: t("contact.sent") };
}

export async function markContactRead(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "message_id");
    if (!id) throw new Error("Mensaje no válido.");
    await db.update("contact_messages", id, { read: field(fd, "read") === "true" });
  });
}

// ---------- Conceptos extra de factura ----------

/** Perfil cuya factura se edita: el propio (empleado) o el indicado si es admin. */
async function invoiceOwner(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
  const profileId = idField(fd, "profile_id") ?? user.profileId;
  if (profileId !== user.profileId && user.role !== "admin") throw new Error("No autorizado.");
  const profile = await data.getProfileById(profileId);
  if (!profile) throw new Error("Empleado no válido.");
  return { user, profile };
}

export async function addInvoiceItemAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user, profile } = await invoiceOwner(fd);
    const month = field(fd, "month");
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Mes no válido.");
    const description = field(fd, "description").slice(0, 200);
    const quantity = Number(field(fd, "quantity").replace(",", ".") || 1);
    const unitPrice = Number(field(fd, "unit_price").replace(",", "."));
    if (!description) throw new Error("Describe el concepto (por ejemplo «PC portátil»).");
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) throw new Error("La cantidad no es válida.");
    if (!Number.isFinite(unitPrice) || Math.abs(unitPrice) > 10_000_000) throw new Error("El precio no es válido.");
    await data.addInvoiceItem({
      user_id: profile.user_id,
      month,
      description,
      quantity,
      unit_price: Math.round(unitPrice * 100) / 100,
      added_by: user.userId,
    });
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Concepto añadido." };
}

export async function deleteInvoiceItemAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { profile } = await invoiceOwner(fd);
    const id = idField(fd, "item_id");
    const item = id ? await data.getInvoiceItem(id) : null;
    if (!item || item.user_id !== profile.user_id) throw new Error("Concepto no encontrado.");
    await data.deleteInvoiceItem(item.id);
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: "Concepto eliminado." };
}

// ---------- Equipamiento (admin) ----------

export async function addEquipmentAction(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const profile = await employeeProfile(fd);
    const name = field(fd, "name").slice(0, 200);
    const assignedAt = field(fd, "assigned_at");
    if (!name) throw new Error("Indica qué equipo o herramienta se entrega.");
    if (!isDayKey(assignedAt)) throw new Error("La fecha de entrega no es válida.");
    const costRaw = field(fd, "cost").replace(",", ".");
    const cost = costRaw ? Number(costRaw) : null;
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) throw new Error("El coste no es válido.");
    const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > 4) throw new Error("Máximo 4 fotos por equipo.");
    const images = await Promise.all(
      files.map(async (f) => {
        if (!LOGO_TYPES.includes(f.type)) throw new Error("Las fotos deben ser PNG, JPG o WebP.");
        if (f.size > 1024 * 1024) throw new Error("Cada foto puede pesar como máximo 1 MB.");
        return `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`;
      }),
    );
    const admin = await getCurrentUser();
    await data.addEquipment(
      {
        user_id: profile.user_id,
        company_id: profile.company_id,
        name,
        serial_number: field(fd, "serial_number").slice(0, 120) || null,
        assigned_at: assignedAt,
        cost: cost === null ? null : Math.round(cost * 100) / 100,
        notes: String(fd.get("notes") ?? "").trim().slice(0, 1000) || null,
        assigned_by: admin?.userId ?? null,
      },
      images,
    );
    return "Equipo asignado.";
  });
}

async function equipmentOf(fd: FormData) {
  const id = idField(fd, "equipment_id");
  const item = id ? await data.getEquipment(id) : null;
  if (!item) throw new Error("Equipo no encontrado.");
  return item;
}

export async function setEquipmentReturned(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const item = await equipmentOf(fd);
    const returned = field(fd, "returned") === "true";
    await data.updateEquipment(item.id, { returned_at: returned ? new Date().toISOString().slice(0, 10) : null });
  });
}

export async function deleteEquipmentAction(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    await data.deleteEquipment((await equipmentOf(fd)).id);
  });
}

// ---------- Administración ----------

/** Comprueba que es admin, ejecuta la mutación y refresca la vista. */
async function asAdmin(fn: () => Promise<string | void>): Promise<FormState> {
  await requireAdmin();
  try {
    const ok = await fn();
    refresh();
    return { ok: ok || undefined };
  } catch (err) {
    return failed(err);
  }
}

export async function createCompany(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const company = await data.createCompany(field(fd, "name"), field(fd, "slug"));
    return `Empresa creada: /${company.slug}`;
  });
}

export async function renameCompany(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "id");
    const name = field(fd, "name");
    if (!id || !name) throw new Error("El nombre es obligatorio.");
    await data.updateCompany(id, { name });
  });
}

export async function setCompanyActive(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "id");
    if (!id) throw new Error("Empresa no válida.");
    await data.updateCompany(id, { active: field(fd, "active") === "true" });
  });
}

export async function deleteCompany(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "id");
    const company = id ? await data.getCompanyById(id) : null;
    if (!company) throw new Error("Empresa no válida.");
    if (field(fd, "confirm") !== company.slug) {
      throw new Error(`Escribe «${company.slug}» para confirmar.`);
    }
    await data.deleteCompany(company.id);
  });
}

export async function setAutoClose(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const id = idField(fd, "id");
    if (!id) throw new Error("Empresa no válida.");
    const hours = Number(fd.get("auto_close_hours") || 8);
    if (!Number.isInteger(hours) || hours < 1 || hours > 24) {
      throw new Error("Las horas de autocierre deben estar entre 1 y 24.");
    }
    await data.updateCompany(id, { auto_close: fd.get("auto_close") === "on", auto_close_hours: hours });
    return "Autocierre guardado.";
  });
}

export async function createEmployee(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const fullName = field(fd, "full_name");
    const email = field(fd, "email").toLowerCase();
    const password = String(fd.get("password") ?? "");
    const companyId = idField(fd, "company_id");
    const hourlyRate = rateField(fd);
    if (!fullName || !email) throw new Error("Nombre y email son obligatorios.");
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    if (companyId && !(await data.getCompanyById(companyId))) throw new Error("Empresa no válida.");
    await data.createEmployee({ email, password, fullName, companyId, hourlyRate });
    return `Empleado creado: ${email}`;
  });
}

async function employeeProfile(fd: FormData) {
  const id = idField(fd, "profile_id");
  const profile = id ? await data.getProfileById(id) : null;
  if (!profile || profile.role !== "employee") throw new Error("Empleado no válido.");
  return profile;
}

export async function assignCompany(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const profile = await employeeProfile(fd);
    const companyId = idField(fd, "company_id");
    if (companyId && !(await data.getCompanyById(companyId))) throw new Error("Empresa no válida.");
    await data.updateProfile(profile.id, { company_id: companyId });
    return "Empresa asignada.";
  });
}

/** Coste del empleado: coste por hora directo, o salario mensual del que se calcula. */
export async function setCost(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const profile = await employeeProfile(fd);
    if (field(fd, "mode") === "salary") {
      const salary = Number(field(fd, "monthly_salary").replace(",", "."));
      const weekly = Number(field(fd, "weekly_hours").replace(",", ".") || 40);
      if (!Number.isFinite(salary) || salary <= 0) throw new Error("Indica un salario mensual válido.");
      if (!Number.isFinite(weekly) || weekly < 1 || weekly > 80) throw new Error("Las horas semanales deben estar entre 1 y 80.");
      const rate = rateFromSalary(salary, weekly);
      await data.updateProfile(profile.id, { monthly_salary: salary, weekly_hours: weekly, hourly_rate: rate });
      return `Coste por hora calculado: ${formatMoney(rate)}/h.`;
    }
    await data.updateProfile(profile.id, { hourly_rate: rateField(fd), monthly_salary: null });
    return "Coste por hora guardado.";
  });
}

export async function setGeoRequired(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const profile = await employeeProfile(fd);
    await data.updateProfile(profile.id, { geo_required: field(fd, "geo_required") === "true" });
  });
}

export async function setEmployeeActive(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const profile = await employeeProfile(fd);
    await data.setEmployeeActive(profile, field(fd, "active") === "true");
  });
}

export async function deleteEmployee(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const profile = await employeeProfile(fd);
    if (field(fd, "confirm").toLowerCase() !== profile.email.toLowerCase()) {
      throw new Error(`Escribe «${profile.email}» para confirmar.`);
    }
    await data.deleteEmployee(profile);
  } catch (err) {
    return failed(err);
  }
  // Su ficha ya no existe: se vuelve al listado.
  redirect("/admin/employees");
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  return asAdmin(async () => {
    const profile = await employeeProfile(fd);
    const password = String(fd.get("password") ?? "");
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    await data.setPassword(profile.user_id, password);
    return "Contraseña actualizada.";
  });
}
