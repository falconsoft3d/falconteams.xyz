import { listOpenEntries } from "@/lib/data";

// Opcional: llamar periódicamente (p. ej. cada 15 min) para cerrar fichajes
// caducados aunque nadie abra la app. Requiere la variable CRON_SECRET:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio/api/cron/auto-close
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  // Leer los fichajes abiertos aplica el autocierre a los que hayan superado el límite.
  const stillOpen = await listOpenEntries();
  return Response.json({ ok: true, open: stillOpen.length });
}
