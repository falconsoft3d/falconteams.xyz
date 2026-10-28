import { getMailAccount } from "@/lib/data";
import { getAttachment } from "@/lib/mail";
import { getCurrentUser } from "@/lib/session";

// Descarga de un adjunto: el dueño del buzón o un admin.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const owner = Number(params.get("owner"));
  if (owner !== user.userId && user.role !== "admin") return Response.json({ error: "No autorizado" }, { status: 403 });
  const account = await getMailAccount(owner);
  const uid = Number(params.get("uid"));
  const index = Number(params.get("i"));
  if (!account || !(uid > 0) || !(index >= 0)) return Response.json({ error: "No encontrado" }, { status: 404 });

  const att = await getAttachment(account, params.get("folder") || "INBOX", uid, index).catch(() => null);
  if (!att) return Response.json({ error: "No encontrado" }, { status: 404 });
  const name = att.filename.replace(/["\r\n]/g, "");
  return new Response(new Uint8Array(att.content), {
    headers: {
      "Content-Type": att.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
