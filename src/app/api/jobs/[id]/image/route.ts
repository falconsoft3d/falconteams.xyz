import { getOffer, getOfferImage } from "@/lib/recruitment";

// Imagen de portada de una oferta (pública, como la propia oferta).
export async function GET(_: Request, { params }: RouteContext<"/api/jobs/[id]/image">) {
  const { id } = await params;
  const offer = Number(id) > 0 ? await getOffer(Number(id)) : null;
  const match = offer ? (await getOfferImage(offer.id))?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.*)$/) : null;
  if (!match) return new Response(null, { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "X-Content-Type-Options": "nosniff",
      // La URL lleva ?v=<fecha>: una imagen nueva cambia la URL.
      "Cache-Control": "public, max-age=86400",
    },
  });
}
