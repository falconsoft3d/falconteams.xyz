import { ActionForm } from "./action-form";
import { ImageInput } from "./file-inputs";
import { OfferDescription } from "./offer-description";
import { btnPrimary, btnSecondary, btnSmall, input, label } from "./ui";
import { saveOffer } from "@/lib/actions";
import { offerImageUrl, type JobOffer } from "@/lib/recruitment";

/** Crear o editar una oferta de empleo. */
export function OfferForm({ companyId, offer }: { companyId: number; offer?: JobOffer }) {
  const id = offer?.id ?? "new";
  return (
    <ActionForm action={saveOffer} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="company_id" value={companyId} />
      {offer && <input type="hidden" name="offer_id" value={offer.id} />}
      <div className="sm:col-span-2">
        <label htmlFor={`title-${id}`} className={label}>Puesto</label>
        <input id={`title-${id}`} name="title" required maxLength={200} defaultValue={offer?.title} placeholder="Consultor/a funcional de Odoo" className={input} />
      </div>
      <OfferDescription id={`desc-${id}`} companyId={companyId} defaultValue={offer?.description} />
      <div className="flex items-center gap-4 sm:col-span-2">
        {offer && offerImageUrl(offer) && (
          // eslint-disable-next-line @next/next/no-img-element -- imagen servida por /api/jobs
          <img src={offerImageUrl(offer)!} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
        )}
        <div className="flex-1">
          <label htmlFor={`img-${id}`} className={label}>Imagen de portada (opcional)</label>
          <ImageInput id={`img-${id}`} name="image" maxBytes={1024 * 1024} maxSide={1600} />
          <p className="mt-1 text-xs text-slate-500">PNG, JPG o WebP. Si pesa más de 1 MB se optimiza sola. Mejor apaisada (por ejemplo 1200×600).</p>
          {offer?.image_updated_at && (
            <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" name="remove_image" className="size-3.5 accent-rose-600" /> Quitar la imagen actual
            </label>
          )}
        </div>
      </div>
      <div>
        <label htmlFor={`loc-${id}`} className={label}>Ubicación</label>
        <input id={`loc-${id}`} name="location" defaultValue={offer?.location ?? ""} placeholder="Madrid" className={input} />
      </div>
      <div>
        <label htmlFor={`mod-${id}`} className={label}>Modalidad</label>
        <input id={`mod-${id}`} name="modality" list="modalities" defaultValue={offer?.modality ?? ""} placeholder="Remoto" className={input} />
        <datalist id="modalities"><option value="Presencial" /><option value="Remoto" /><option value="Híbrido" /></datalist>
      </div>
      <div>
        <label htmlFor={`type-${id}`} className={label}>Tipo de contrato</label>
        <input id={`type-${id}`} name="employment_type" list="types" defaultValue={offer?.employment_type ?? ""} placeholder="Jornada completa" className={input} />
        <datalist id="types"><option value="Jornada completa" /><option value="Media jornada" /><option value="Freelance" /><option value="Prácticas" /></datalist>
      </div>
      <div>
        <label htmlFor={`sal-${id}`} className={label}>Salario (opcional)</label>
        <input id={`sal-${id}`} name="salary" defaultValue={offer?.salary ?? ""} placeholder="30.000 – 38.000 €/año" className={input} />
      </div>
      <div className="sm:col-span-2">
        <button className={`${offer ? btnSecondary : btnPrimary} ${btnSmall}`}>{offer ? "Guardar cambios" : "Publicar oferta"}</button>
      </div>
    </ActionForm>
  );
}
