export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-12 text-sm text-slate-500">
      <span className="mr-2 size-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-700" />
      {label}
    </div>
  );
}
