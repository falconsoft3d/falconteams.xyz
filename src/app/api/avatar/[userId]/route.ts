import { getAvatar } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";

// Foto de perfil, visible para cualquier usuario con sesión iniciada.
export async function GET(_: Request, { params }: RouteContext<"/api/avatar/[userId]">) {
  if (!(await getCurrentUser())) return new Response(null, { status: 401 });
  const { userId } = await params;
  const image = Number(userId) > 0 ? await getAvatar(Number(userId)) : null;
  const match = image?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.*)$/);
  if (!match) return new Response(null, { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "X-Content-Type-Options": "nosniff",
      // La URL lleva ?v=<fecha>, así que puede cachearse: una foto nueva cambia la URL.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
