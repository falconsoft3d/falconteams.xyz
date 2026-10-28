import type { JobOffer } from "@/lib/recruitment";

/** Etiquetas de ubicación, modalidad, contrato y salario de una oferta. */
export function OfferMeta({ offer }: { offer: JobOffer }) {
  const items = [
    offer.location && `📍 ${offer.location}`,
    offer.modality && `🏠 ${offer.modality}`,
    offer.employment_type && `📄 ${offer.employment_type}`,
    offer.salary && `💶 ${offer.salary}`,
  ].filter(Boolean) as string[];
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{i}</span>
      ))}
    </div>
  );
}
