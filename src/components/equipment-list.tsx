import { ActionForm } from "./action-form";
import { ImageInput } from "./file-inputs";
import { btnDanger, btnPrimary, btnSecondary, btnSmall, card, input, label } from "./ui";
import { addEquipmentAction, deleteEquipmentAction, setEquipmentReturned } from "@/lib/actions";
import type { Equipment } from "@/lib/data";
import { formatMoney } from "@/lib/money";

const date = (key: string) => key.slice(0, 10).split("-").reverse().join("/");

/**
 * Equipos asignados a un empleado. Con `admin` se pueden asignar nuevos,
 * marcarlos como devueltos o eliminarlos.
 */
export function EquipmentList({ items, images, admin }: {
  items: Equipment[];
  /** id del equipo → ids de sus fotos. */
  images: Map<number, number[]>;
  admin?: { profileId: number; today: string };
}) {
  const active = items.filter((i) => !i.returned_at);
  const total = active.reduce((s, i) => s + (i.cost === null ? 0 : Number(i.cost)), 0);
  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Equipamiento asignado</h2>
        <span className="text-sm text-slate-500">{active.length} en uso{total ? ` · valor ${formatMoney(total)}` : ""}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{admin ? "No tiene equipos asignados." : "No tienes equipos asignados."}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className={`rounded-xl border border-slate-200 p-4 ${item.returned_at ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">Entregado el {date(item.assigned_at)}</p>
                </div>
                {item.returned_at ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">devuelto el {date(item.returned_at)}</span>
                ) : (
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">en uso</span>
                )}
              </div>
              <dl className="mt-2 grid grid-cols-[7rem_1fr] gap-x-2 gap-y-0.5 text-sm">
                {item.serial_number && (<><dt className="text-slate-500">Nº de serie</dt><dd className="font-mono text-xs leading-5 text-slate-800">{item.serial_number}</dd></>)}
                {item.cost !== null && (<><dt className="text-slate-500">Coste</dt><dd className="text-slate-800">{formatMoney(Number(item.cost))}</dd></>)}
              </dl>
              {item.notes && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{item.notes}</p>}
              {(images.get(item.id) ?? []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {images.get(item.id)!.map((imageId) => (
                    <a key={imageId} href={`/api/equipment/image/${imageId}`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- imagen servida por /api/equipment */}
                      <img src={`/api/equipment/image/${imageId}`} alt={item.name} className="size-20 rounded-lg object-cover ring-1 ring-slate-200 hover:ring-teal-400" />
                    </a>
                  ))}
                </div>
              )}
              {admin && (
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <ActionForm action={setEquipmentReturned} showOk={false}>
                    <input type="hidden" name="equipment_id" value={item.id} />
                    <input type="hidden" name="returned" value={String(!item.returned_at)} />
                    <button className={`${btnSecondary} ${btnSmall}`}>{item.returned_at ? "Volver a asignar" : "Marcar devuelto"}</button>
                  </ActionForm>
                  <ActionForm action={deleteEquipmentAction} showOk={false}>
                    <input type="hidden" name="equipment_id" value={item.id} />
                    <button className={`${btnDanger} ${btnSmall}`}>Eliminar</button>
                  </ActionForm>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {admin && (
        <details className="mt-4 rounded-xl bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">+ Asignar equipo o herramienta</summary>
          <ActionForm action={addEquipmentAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="profile_id" value={admin.profileId} />
            <div>
              <label htmlFor="eq-name" className={label}>Nombre</label>
              <input id="eq-name" name="name" required maxLength={200} placeholder="Portátil Dell Latitude 5440" className={input} />
            </div>
            <div>
              <label htmlFor="eq-serial" className={label}>Número de serie</label>
              <input id="eq-serial" name="serial_number" maxLength={120} placeholder="SN-ABC123" className={input} />
            </div>
            <div>
              <label htmlFor="eq-date" className={label}>Fecha de entrega</label>
              <input id="eq-date" name="assigned_at" type="date" required defaultValue={admin.today} className={input} />
            </div>
            <div>
              <label htmlFor="eq-cost" className={label}>Coste (€)</label>
              <input id="eq-cost" name="cost" type="number" min={0} step="0.01" placeholder="1400" className={input} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="eq-images" className={label}>Fotos (hasta 4)</label>
              <ImageInput id="eq-images" name="images" multiple maxFiles={4} maxBytes={700 * 1024} maxSide={1400} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="eq-notes" className={label}>Notas (opcional)</label>
              <textarea id="eq-notes" name="notes" rows={2} maxLength={1000} placeholder="Incluye cargador y funda." className={input} />
            </div>
            <div className="sm:col-span-2">
              <button className={`${btnPrimary} ${btnSmall}`}>Asignar</button>
            </div>
          </ActionForm>
        </details>
      )}
    </section>
  );
}
