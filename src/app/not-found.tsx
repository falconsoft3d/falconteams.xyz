import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Página no encontrada</h1>
      <p className="text-slate-500">La empresa o la página que buscas no existe.</p>
      <Link href="/" className="text-teal-700 hover:underline">Volver al inicio</Link>
    </main>
  );
}
