import { ActionForm } from "./action-form";
import { btnDanger, btnSecondary, btnSmall, input } from "./ui";
import { assignCompany, deleteEmployee, resetPassword, setEmployeeActive, setGeoRequired } from "@/lib/actions";
import type { Company, Profile } from "@/lib/data";

export function CompanySelect({ companies, name = "company_id", defaultValue, className }: {
  companies: Company[];
  name?: string;
  defaultValue?: number | null;
  className?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} aria-label="Empresa" className={className ?? input}>
      <option value="">Sin empresa</option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}{c.active ? "" : " (inactiva)"}
        </option>
      ))}
    </select>
  );
}

export function AssignCompanyForm({ profile, companies }: { profile: Profile; companies: Company[] }) {
  return (
    <ActionForm action={assignCompany} showOk={false} className="flex flex-wrap gap-2">
      <input type="hidden" name="profile_id" value={profile.id} />
      <CompanySelect companies={companies} defaultValue={profile.company_id} className={`${input} w-auto! min-w-40 py-1.5!`} />
      <button className={`${btnSecondary} ${btnSmall}`}>Asignar</button>
    </ActionForm>
  );
}

export function GeoRequiredForm({ profile }: { profile: Profile }) {
  return (
    <ActionForm action={setGeoRequired} showOk={false} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="profile_id" value={profile.id} />
      <input type="hidden" name="geo_required" value={String(!profile.geo_required)} />
      <span className={`text-sm ${profile.geo_required ? "font-medium text-teal-700" : "text-slate-500"}`}>
        {profile.geo_required ? "📍 Activada" : "Desactivada"}
      </span>
      <button className={`${btnSecondary} ${btnSmall}`}>{profile.geo_required ? "Desactivar" : "Activar"}</button>
    </ActionForm>
  );
}

export function ToggleActiveForm({ profile }: { profile: Profile }) {
  return (
    <ActionForm action={setEmployeeActive} showOk={false}>
      <input type="hidden" name="profile_id" value={profile.id} />
      <input type="hidden" name="active" value={String(!profile.active)} />
      <button className={`${btnSecondary} ${btnSmall}`}>{profile.active ? "Desactivar" : "Activar"}</button>
    </ActionForm>
  );
}

export function ResetPasswordForm({ profile }: { profile: Profile }) {
  return (
    <ActionForm action={resetPassword} className="flex flex-wrap gap-2">
      <input type="hidden" name="profile_id" value={profile.id} />
      <input name="password" type="password" minLength={8} required placeholder="Nueva contraseña" autoComplete="new-password" className={`${input} w-auto! min-w-40 py-1.5!`} />
      <button className={`${btnSecondary} ${btnSmall}`}>Cambiar contraseña</button>
    </ActionForm>
  );
}

export function DeleteEmployeeForm({ profile }: { profile: Profile }) {
  return (
    <details className="rounded-2xl border border-red-100 bg-white p-5">
      <summary className="cursor-pointer font-semibold text-red-700">Eliminar empleado</summary>
      <p className="mt-2 text-sm text-slate-600">
        Se borran para siempre su cuenta, fichajes, ausencias, objetivos, facturas, equipos y chat.
        Si solo quieres quitarle el acceso y conservar su historial, desactívalo.
      </p>
      <ActionForm action={deleteEmployee} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="profile_id" value={profile.id} />
        <input
          name="confirm"
          required
          autoComplete="off"
          placeholder={profile.email}
          aria-label={`Escribe ${profile.email} para confirmar`}
          className={`${input} w-auto! min-w-64 py-1.5!`}
        />
        <button className={`${btnDanger} ${btnSmall}`}>Eliminar definitivamente</button>
      </ActionForm>
    </details>
  );
}
