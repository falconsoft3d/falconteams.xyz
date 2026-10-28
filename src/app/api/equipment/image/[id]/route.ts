import { getEquipment, getEquipmentImage } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";

// Foto de un equipo asignado: la ve el empleado que lo tiene o un admin.
export async function GET(_: Request, { params }: RouteContext<"/api/equipment/image/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await params;
  const image = Number(id) > 0 ? await getEquipmentImage(Number(id)) : null;
  const item = image ? await getEquipment(image.equipment_id) : null;
  if (!image || !item || (user.role !== "admin" && item.user_id !== user.userId)) return new Response(null, { status: 404 });
  const match = image.image.match(/^data:(image\/(?:png|jpeg|webp));base64,(.*)$/);
  if (!match) return new Response(null, { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: { "Content-Type": match[1], "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=86400" },
  });
}
