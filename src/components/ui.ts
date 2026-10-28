// Clases de Tailwind reutilizables para mantener un estilo coherente.

export const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
export const label = "mb-1 block text-sm font-medium text-slate-700";
export const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60";
const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
export const btnPrimary = `${btn} bg-teal-700 text-white hover:bg-teal-800`;
export const btnSecondary = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
export const btnDanger = `${btn} border border-red-200 bg-white text-red-700 hover:bg-red-50`;
export const btnSmall = "px-3! py-1.5! text-xs!";
export const pageTitle = "text-2xl font-bold tracking-tight text-slate-900";
