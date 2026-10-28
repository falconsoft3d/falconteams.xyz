import "server-only";
import { notFound } from "next/navigation";
import { getMailAccount, getProfileById } from "@/lib/data";

/** Perfil y buzón de un usuario para las páginas de correo del admin. */
export async function mailboxOf(profileId: string) {
  const profile = Number(profileId) > 0 ? await getProfileById(Number(profileId)) : null;
  if (!profile) notFound();
  return { profile, account: await getMailAccount(profile.user_id) };
}
