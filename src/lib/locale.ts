import "server-only";
import { cookies, headers } from "next/headers";
import { isLocale, translator, type Locale } from "./i18n";

export const LOCALE_COOKIE = "ft_lang";

/**
 * Idioma de la petición: cookie elegida por el usuario o, si no, el del navegador.
 * Sin cache() a propósito: en una server action, la fase de la acción y el render
 * posterior usan objetos de cookies distintos (ver session.ts).
 */
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^\s*en\b/i.test(accept) ? "en" : "es";
}

export async function getT() {
  return translator(await getLocale());
}
