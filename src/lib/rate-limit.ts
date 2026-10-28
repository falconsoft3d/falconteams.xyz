import "server-only";

// Límite de peticiones en memoria (por instancia del servidor). Suficiente para
// frenar abusos de los formularios públicos que gastan llamadas a la IA.

const hits = new Map<string, number[]>();

/** true si la clave ha superado `max` usos en la ventana de `windowMs`. */
export function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10000) hits.clear();
  return recent.length > max;
}
