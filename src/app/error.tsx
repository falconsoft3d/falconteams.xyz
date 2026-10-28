"use client";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Algo ha fallado</h1>
      <p className="max-w-md text-slate-500">{error instanceof Error ? error.message : "Error inesperado."}</p>
      <button onClick={() => retry()} className="text-teal-700 hover:underline">Reintentar</button>
    </main>
  );
}
