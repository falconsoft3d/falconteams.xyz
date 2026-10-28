import { getGoal } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";

// Descarga del documento adjunto a un objetivo: solo su empleado o un admin.
export async function GET(_: Request, { params }: RouteContext<"/api/goals/[id]/file">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const goal = Number(id) > 0 ? await getGoal(Number(id), true) : null;
  if (!goal || (user.role !== "admin" && goal.user_id !== user.userId)) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }
  const match = goal.evidence_file?.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return Response.json({ error: "Sin documento" }, { status: 404 });

  const filename = (goal.evidence_file_name ?? "documento").replace(/["\r\n]/g, "");
  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      // Siempre como descarga, para que nunca se interprete en la página.
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
