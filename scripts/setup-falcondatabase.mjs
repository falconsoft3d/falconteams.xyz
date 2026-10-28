#!/usr/bin/env node
// Prepara un proyecto de falcondatabase para FalconTeams:
//   - activa el login de usuarios (sin registro público),
//   - crea las tablas de falcondatabase/schema.json que falten y añade las columnas que falten,
//   - opcionalmente crea el primer administrador (ADMIN_EMAIL y ADMIN_PASSWORD).
// Es idempotente: se puede ejecutar varias veces y nunca borra nada.
//
// Uso:  npm run setup
//       ADMIN_EMAIL=admin@tuempresa.com ADMIN_PASSWORD='…' npm run setup

import { readFileSync, existsSync } from "node:fs";

// Variables de .env.local (sin dependencias) y del entorno, que tienen prioridad.
const env = { ...loadEnv(".env.local"), ...process.env };
const BASE = (env.FDB_URL || "https://falcondatabase.com").replace(/\/$/, "");
const PROJECT = env.FDB_PROJECT;
const TOKEN = env.FDB_AI_TOKEN;

if (!PROJECT || !TOKEN) {
  console.error("Faltan FDB_PROJECT y FDB_AI_TOKEN (en .env.local o en el entorno).");
  process.exit(1);
}

const schema = JSON.parse(readFileSync(new URL("../falcondatabase/schema.json", import.meta.url), "utf8"));

async function tool(name, args = {}) {
  const res = await fetch(`${BASE}/api/ai/tools/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ project: PROJECT, ...args }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
  return body.data;
}

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const vars = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return vars;
}

const project = await tool("describe_project");
console.log(`Proyecto: ${project.name} (${project.ref})`);

await tool("update_auth_settings", schema.auth);
console.log("✓ Login activado, registro público desactivado");

const existing = new Map(project.tables.map((t) => [t.name, new Set(t.columns.map((c) => c.name))]));
let created = 0;
let added = 0;
for (const table of schema.tables) {
  const cols = existing.get(table.name);
  if (!cols) {
    await tool("create_table", { name: table.name, access: table.access, description: table.description, columns: table.columns });
    console.log(`✓ Tabla creada: ${table.name}`);
    created++;
    continue;
  }
  for (const column of table.columns) {
    if (cols.has(column.name)) continue;
    await tool("add_column", { table: table.name, ...column });
    console.log(`✓ Columna añadida: ${table.name}.${column.name}`);
    added++;
  }
}
console.log(`Tablas: ${created} creadas, ${schema.tables.length - created} ya existían · ${added} columnas añadidas`);

// Primer administrador (opcional).
if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
  const email = env.ADMIN_EMAIL.trim().toLowerCase();
  try {
    await tool("create_user", { email, password: env.ADMIN_PASSWORD, data: { name: "Administrador" } });
    console.log(`✓ Usuario creado: ${email}`);
  } catch (err) {
    if (err.status !== 409) throw err;
    console.log(`· El usuario ${email} ya existía`);
  }
  const { users } = await tool("list_users");
  const user = users.find((u) => u.email === email);
  const profiles = await tool("query_rows", { table: "profiles", filters: { user_id: user.id } });
  if (profiles.data.length) {
    console.log(`· ${email} ya tiene perfil (${profiles.data[0].role})`);
  } else {
    await tool("insert_rows", { table: "profiles", rows: [{ user_id: user.id, email, full_name: "Administrador", role: "admin" }] });
    console.log(`✓ ${email} es administrador`);
  }
}

console.log(`\nListo. Clave anon del proyecto (FDB_ANON_KEY): ${project.anon_key}`);
