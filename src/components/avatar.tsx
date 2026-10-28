/** Foto de perfil, o las iniciales si no tiene. */
export function Avatar({ name, url, size = "size-8" }: { name: string; url: string | null; size?: string }) {
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- imagen servida por /api/avatar con sesión
    return <img src={url} alt={name} className={`${size} shrink-0 rounded-full object-cover ring-1 ring-slate-200`} />;
  }
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800`}>
      {initials}
    </span>
  );
}
