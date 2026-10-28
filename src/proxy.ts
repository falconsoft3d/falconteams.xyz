import { NextResponse, type NextRequest } from "next/server";
import { checkEnv, type EnvProblem } from "@/lib/env";

// Antes de servir el sitio se comprueba la configuración. Si falta alguna
// variable de entorno obligatoria, en vez de fallar con un error genérico se
// responde con una página que explica qué falta (sin mostrar ningún valor).

export function proxy(request: NextRequest) {
  const problems = checkEnv();
  if (!problems.length) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "El servidor no está configurado: faltan variables de entorno.", variables: problems.map((p) => p.name) },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return new NextResponse(setupPage(problems), {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60" },
  });
}

export const config = {
  // Todo menos los recursos estáticos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|falconteams-extension.zip).*)"],
};

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Página autónoma (HTML y CSS en línea): funciona aunque la app no pueda renderizar. */
function setupPage(problems: EnvProblem[]) {
  const rows = problems
    .map(
      (p) => `<li><code>${escape(p.name)}</code><span class="tag ${p.problem}">${p.problem === "missing" ? "falta" : "no válida"}</span><p>${escape(p.hint)}</p></li>`,
    )
    .join("");
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Configuración pendiente · FalconTeams</title>
<style>
  :root { color-scheme: light dark; --bg: #f8fafc; --card: #fff; --fg: #0f172a; --muted: #64748b; --line: #e2e8f0; --teal: #0f766e; }
  @media (prefers-color-scheme: dark) { :root { --bg: #020617; --card: #0f172a; --fg: #f1f5f9; --muted: #94a3b8; --line: #1e293b; --teal: #5eead4; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; }
  main { width: 100%; max-width: 680px; background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,.06); }
  .logo { display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: 10px; background: #0f766e; color: #fff; font-weight: 700; }
  h1 { margin: 16px 0 6px; font-size: 22px; }
  .muted { color: var(--muted); margin: 0; }
  ul { list-style: none; padding: 0; margin: 24px 0; display: grid; gap: 10px; }
  li { border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
  li p { margin: 6px 0 0; color: var(--muted); font-size: 13px; }
  code { font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .tag { margin-left: 8px; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .missing { background: #fee2e2; color: #991b1b; }
  .invalid { background: #fef3c7; color: #92400e; }
  ol { padding-left: 20px; color: var(--muted); }
  ol li { border: 0; padding: 2px 0; }
  pre { background: rgba(100,116,139,.12); border-radius: 10px; padding: 12px; overflow-x: auto; font-size: 13px; }
  a { color: var(--teal); }
</style>
</head>
<body>
<main>
  <span class="logo">FT</span>
  <h1>Falta configurar el servidor</h1>
  <p class="muted">FalconTeams no puede arrancar hasta que estén definidas estas variables de entorno. Por seguridad, aquí solo se muestran sus nombres.</p>
  <ul>${rows}</ul>
  <h2 style="font-size:16px;margin:0 0 6px">Cómo solucionarlo</h2>
  <ol>
    <li>En local: añádelas al fichero <code>.env.local</code> (tienes la plantilla en <code>.env.example</code>).</li>
    <li>En un servidor o hosting (Vercel, Docker, VPS…): defínelas en sus variables de entorno.</li>
    <li>Reinicia el servidor. Si cambias alguna <code>NEXT_PUBLIC_*</code>, vuelve a ejecutar <code>npm run build</code>.</li>
  </ol>
  <pre>cp .env.example .env.local
ADMIN_EMAIL=admin@tuempresa.com ADMIN_PASSWORD='…' npm run setup</pre>
  <p class="muted">Más información en el <a href="https://github.com/falconsoft3d/falconteams.xyz#puesta-en-marcha">README del proyecto</a>.</p>
</main>
</body>
</html>`;
}
