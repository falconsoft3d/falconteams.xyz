// FalconTeams · extensión para fichar desde la barra de Chrome.
// Guarda en chrome.storage.local la dirección de la empresa y el token de sesión,
// y habla con la API /api/ext/* de la aplicación.

const EN = navigator.language.toLowerCase().startsWith("en");
const TEXT = EN
  ? {
      companyUrl: "Your company address", email: "Email", password: "Password", signIn: "Sign in",
      openApp: "Open FalconTeams", logout: "Log out", clockIn: "Clock in", clockOut: "Clock out",
      tabClock: "Clock", tabChat: "Chat", send: "Send", noContacts: "Nobody to chat with yet.", noMessages: "Write the first message.", ai: "AI assistant",
      working: "Working since", off: "Off shift", today: "Worked today:", notes: "What did you do? (optional)",
      autoclose: "Closes automatically at", geo: "📍 Your location will be recorded.", locating: "Getting location…",
      badUrl: "Paste your company address, e.g. https://falconteams.xyz/my-company",
      geoDenied: "Allow location access to clock in.", network: "Cannot connect to FalconTeams.", expired: "Your session has expired. Sign in again.",
    }
  : {
      companyUrl: "Dirección de tu empresa", email: "Email", password: "Contraseña", signIn: "Entrar",
      openApp: "Abrir FalconTeams", logout: "Salir", clockIn: "Registrar entrada", clockOut: "Registrar salida",
      tabClock: "Fichar", tabChat: "Chat", send: "Enviar", noContacts: "No hay nadie con quien hablar todavía.", noMessages: "Escribe el primer mensaje.", ai: "Asistente IA",
      working: "Trabajando desde las", off: "Fuera de turno", today: "Hoy:", notes: "¿Qué has hecho? (opcional)",
      autoclose: "Se cerrará automáticamente a las", geo: "📍 Se registrará tu ubicación.", locating: "Obteniendo ubicación…",
      badUrl: "Pega la dirección de tu empresa, p. ej. https://falconteams.xyz/mi-empresa",
      geoDenied: "Permite el acceso a tu ubicación para fichar.", network: "No se puede conectar con FalconTeams.", expired: "Tu sesión ha caducado. Vuelve a entrar.",
    };

const $ = (id) => document.getElementById(id);
document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = TEXT[el.dataset.t]));
$("notes").placeholder = TEXT.notes;
$("message").placeholder = TEXT.send + "…";

let config = null; // { base, slug, token, name, company }
let timer = null;

const time = (iso) => new Date(iso).toLocaleTimeString(EN ? "en-GB" : "es-ES", { hour: "2-digit", minute: "2-digit" });
const pad = (n) => String(n).padStart(2, "0");
const hms = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

function showError(message) {
  $("error").textContent = message || "";
  $("error").hidden = !message;
}

async function api(path, options = {}) {
  let res;
  try {
    // "status" → /api/ext/status; "/api/chat…" → ruta absoluta de la app.
    res = await fetch(path.startsWith("/") ? `${config.base}${path}` : `${config.base}/api/ext/${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(config.token && { Authorization: `Bearer ${config.token}` }) },
    });
  } catch {
    throw new Error(TEXT.network);
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "login") {
    await chrome.storage.local.remove("config");
    config = { base: config.base, slug: config.slug };
    showSetup();
    throw new Error(TEXT.expired);
  }
  if (!res.ok) throw new Error(body.error || TEXT.network);
  return body;
}

function showSetup() {
  clearInterval(timer);
  stopChat();
  $("tabs").hidden = true;
  $("chat").hidden = true;
  $("main").hidden = true;
  $("setup").hidden = false;
  if (config?.base) $("login-form").url.value = `${config.base}/${config.slug || ""}`.replace(/\/$/, "");
}

async function refresh() {
  const status = await api("status");
  $("setup").hidden = true;
  $("tabs").hidden = false;
  if ($("chat").hidden) $("main").hidden = false;
  loadContacts();
  $("title").textContent = status.company?.name || "FalconTeams";
  $("user").textContent = status.user.name;
  $("company").textContent = status.company?.name || "Admin";
  $("open").href = status.company ? `${config.base}/${status.company.slug}` : `${config.base}/admin`;

  const open = status.open;
  const btn = $("clock");
  btn.textContent = open ? TEXT.clockOut : TEXT.clockIn;
  btn.classList.toggle("out", !!open);
  btn.dataset.action = open ? "out" : "in";
  btn.dataset.geo = status.geoRequired ? "1" : "";
  $("notes").hidden = !open;
  $("geo").hidden = !status.geoRequired;
  $("geo").textContent = TEXT.geo;
  $("status").textContent = open ? `${TEXT.working} ${time(open.clockIn)}` : TEXT.off;
  $("status").classList.toggle("on", !!open);

  const auto = open && status.company?.autoCloseHours;
  $("autoclose").hidden = !auto;
  if (auto) $("autoclose").textContent = `${TEXT.autoclose} ${time(new Date(Date.parse(open.clockIn) + auto * 3600000))}`;

  clearInterval(timer);
  const tick = () => {
    const running = open ? Date.now() - Date.parse(open.clockIn) : 0;
    $("timer").textContent = hms(running || status.todayClosedMs);
    $("today").textContent = `${TEXT.today} ${hms(status.todayClosedMs + running)}`;
  };
  tick();
  if (open) timer = setInterval(tick, 1000);
}

function locate() {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => reject(new Error(TEXT.geoDenied)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    ),
  );
}

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");
  const form = event.currentTarget;
  let url;
  try {
    url = new URL(form.url.value.trim());
  } catch {
    return showError(TEXT.badUrl);
  }
  const slug = url.pathname.split("/").filter(Boolean)[0] || "";
  config = { base: url.origin, slug: slug === "login" || slug === "admin" ? "" : slug };
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    const res = await api("login", {
      method: "POST",
      body: JSON.stringify({ email: form.email.value, password: form.password.value, company: config.slug }),
    });
    config = { ...config, token: res.token, name: res.user.name };
    await chrome.storage.local.set({ config });
    form.password.value = "";
    await refresh();
  } catch (err) {
    showError(err.message);
  } finally {
    button.disabled = false;
  }
});

$("clock").addEventListener("click", async (event) => {
  const btn = event.currentTarget;
  showError("");
  btn.disabled = true;
  try {
    const body = { action: btn.dataset.action };
    if (btn.dataset.action === "out") body.notes = $("notes").value;
    if (btn.dataset.geo) {
      btn.textContent = TEXT.locating;
      Object.assign(body, await locate());
    }
    await api("clock", { method: "POST", body: JSON.stringify(body) });
    $("notes").value = "";
    await refresh();
  } catch (err) {
    showError(err.message);
    await refresh().catch(() => {});
  } finally {
    btn.disabled = false;
  }
});

$("logout").addEventListener("click", async () => {
  await chrome.storage.local.remove("config");
  config = { base: config.base, slug: config.slug };
  showSetup();
});

chrome.storage.local.get("config").then(async ({ config: saved }) => {
  config = saved || null;
  if (!config?.token) return showSetup();
  try {
    await refresh();
  } catch (err) {
    showError(err.message);
  }
});

// ---------- Chat ----------

let contactsTimer = null;
let messagesTimer = null;
let peer = null; // { key, name }
let lastId = 0;

const initials = (name) => name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const companyParam = () => encodeURIComponent(config.slug || "");

function stopChat() {
  clearInterval(contactsTimer);
  clearInterval(messagesTimer);
  contactsTimer = messagesTimer = null;
}

function showTab(tab) {
  $("tab-clock").classList.toggle("active", tab === "clock");
  $("tab-chat").classList.toggle("active", tab === "chat");
  $("main").hidden = tab !== "clock";
  $("chat").hidden = tab !== "chat";
  if (tab === "chat") {
    loadContacts();
    clearInterval(contactsTimer);
    contactsTimer = setInterval(loadContacts, 10000);
  } else {
    stopChat();
  }
}

async function loadContacts() {
  const body = await api(`/api/chat/contacts?company=${companyParam()}`).catch(() => null);
  if (!body) return;
  const badge = $("chat-badge");
  badge.hidden = !body.unread;
  badge.textContent = body.unread;
  const list = $("contacts");
  list.replaceChildren();
  const entries = [
    ...(body.ai ? [{ key: "ai", name: TEXT.ai, unread: 0, ai: true }] : []),
    ...body.contacts.map((c) => ({ key: String(c.id), name: c.name, unread: c.unread })),
  ];
  if (!entries.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = TEXT.noContacts;
    list.append(li);
  }
  for (const c of entries) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = c.ai ? "🤖" : initials(c.name);
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = c.name;
    btn.append(avatar, name);
    if (c.unread) {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = c.unread;
      btn.append(b);
    }
    btn.addEventListener("click", () => openConversation(c));
    li.append(btn);
    list.append(li);
  }
}

function renderMessages(messages, append) {
  const box = $("messages");
  if (!append) box.replaceChildren();
  if (!append && !messages.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = TEXT.noMessages;
    box.append(p);
  }
  if (append && messages.length) box.querySelector(".empty")?.remove();
  for (const m of messages) {
    const div = document.createElement("div");
    div.className = `msg ${m.mine ? "mine" : "theirs"}${m.ai ? " ai" : ""}`;
    div.textContent = m.content;
    box.append(div);
  }
  if (messages.length) {
    lastId = messages[messages.length - 1].id;
    box.scrollTop = box.scrollHeight;
  }
}

async function fetchMessages(append) {
  if (!peer) return;
  const body = await api(`/api/chat?company=${companyParam()}&with=${peer.key}&after=${append ? lastId : 0}`).catch(() => null);
  if (body) renderMessages(body.messages, append);
}

async function openConversation(c) {
  peer = c;
  lastId = 0;
  $("contacts").hidden = true;
  $("conversation").hidden = false;
  $("peer").textContent = c.name;
  await fetchMessages(false);
  clearInterval(messagesTimer);
  messagesTimer = setInterval(() => fetchMessages(true), 3000);
  $("message").focus();
}

$("back").addEventListener("click", () => {
  peer = null;
  clearInterval(messagesTimer);
  $("conversation").hidden = true;
  $("contacts").hidden = false;
  loadContacts();
});

$("send-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = $("message").value.trim();
  if (!content || !peer) return;
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  showError("");
  try {
    await api("/api/chat", { method: "POST", body: JSON.stringify({ company: config.slug || "", with: peer.key, content }) });
    $("message").value = "";
    await fetchMessages(true);
  } catch (err) {
    showError(err.message);
  } finally {
    button.disabled = false;
  }
});

$("message").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("send-form").requestSubmit();
  }
});

$("tab-clock").addEventListener("click", () => showTab("clock"));
$("tab-chat").addEventListener("click", () => showTab("chat"));
