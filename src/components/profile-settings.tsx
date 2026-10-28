import { ActionForm } from "./action-form";
import { Avatar } from "./avatar";
import { ImageInput } from "./file-inputs";
import { btnPrimary, btnSecondary, btnSmall, card, input, label } from "./ui";
import { changePassword, updateAvatar } from "@/lib/actions";
import type { CurrentUser } from "@/lib/session";

/** Foto de perfil y cambio de contraseña del usuario actual. */
export function ProfileSettings({ user }: { user: CurrentUser }) {
  return (
    <div className="grid max-w-4xl gap-6 md:grid-cols-2">
      <section className={card}>
        <h2 className="mb-4 font-semibold text-slate-900">Foto de perfil</h2>
        <div className="flex items-center gap-4">
          <Avatar name={user.name} url={user.avatarUrl} size="size-20" />
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-900">{user.name}</p>
            <p>{user.email}</p>
          </div>
        </div>
        <ActionForm action={updateAvatar} className="mt-4 space-y-3">
          <ImageInput name="avatar" maxBytes={300 * 1024} maxSide={512} required />
          <p className="text-xs text-slate-500">PNG, JPG o WebP. Si pesa más de 300 KB se optimiza sola.</p>
          <button className={`${btnPrimary} ${btnSmall}`}>Subir foto</button>
        </ActionForm>
        {user.avatarUrl && (
          <ActionForm action={updateAvatar} showOk={false} className="mt-2">
            <input type="hidden" name="remove" value="1" />
            <button className={`${btnSecondary} ${btnSmall}`}>Quitar foto</button>
          </ActionForm>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-4 font-semibold text-slate-900">Cambiar contraseña</h2>
        <ActionForm action={changePassword} className="space-y-3">
          <div>
            <label htmlFor="current_password" className={label}>Contraseña actual</label>
            <input id="current_password" name="current_password" type="password" autoComplete="current-password" required className={input} />
          </div>
          <div>
            <label htmlFor="new_password" className={label}>Nueva contraseña</label>
            <input id="new_password" name="new_password" type="password" autoComplete="new-password" minLength={8} required className={input} />
          </div>
          <div>
            <label htmlFor="confirm_password" className={label}>Repite la nueva contraseña</label>
            <input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required className={input} />
          </div>
          <button className={`${btnPrimary} ${btnSmall}`}>Cambiar contraseña</button>
        </ActionForm>
      </section>
    </div>
  );
}
