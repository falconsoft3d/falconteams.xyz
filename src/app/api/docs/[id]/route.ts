import { getCompanyById, getDocFile } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";

// Descarga de un fichero de documentación: admins y empleados de su empresa.
export async function GET(_: Request, { params }: RouteContext<"/api/docs/[id]">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const file = Number(id) > 0 ? await getDocFile(Number(id), true) : null;
  const company = file ? await getCompanyById(file.company_id) : null;
  const member = user.role === "admin" || (user.company?.id === file?.company_id && company?.active);
  if (!file || !member) return Response.json({ error: "No encontrado" }, { status: 404 });

  const match = file.content?.match(/^data:([^;]*);base64,(.*)$/);
  if (!match) return Response.json({ error: "Fichero dañado" }, { status: 500 });
  const name = file.name.replace(/["\r\n]/g, "");
  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
