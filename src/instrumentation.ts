import type { Instrumentation } from "next";

// Al arrancar el servidor: aviso claro si falta configuración (el proxy muestra
// además una página explicativa en vez del sitio).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkEnv } = await import("./lib/env");
  const problems = checkEnv();
  if (problems.length) {
    console.error(
      "\n⚠️  FalconTeams: configuración incompleta. El sitio mostrará una página de configuración hasta que se corrija:\n" +
        problems.map((p) => `   - ${p.name} (${p.problem === "missing" ? "falta" : "no válida"}): ${p.hint}`).join("\n") +
        "\n",
    );
  }
}

// Errores del servidor con su ruta y su «digest»: es el código que muestra el
// navegador en producción (por ejemplo, el error #441 de React) para buscarlo aquí.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err as Error & { digest?: string };
  console.error(
    `[FalconTeams] Error en ${request.method} ${request.path} (${context.routeType}${context.routePath ? ` ${context.routePath}` : ""})` +
      `${error.digest ? ` · digest ${error.digest}` : ""}: ${error.message}`,
  );
};
