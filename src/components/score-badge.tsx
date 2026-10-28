/** Puntuación 0-100 con color según el resultado. */
export function ScoreBadge({ score, size = "text-sm" }: { score: number | null; size?: string }) {
  if (score === null) return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">sin evaluar</span>;
  const tone = score >= 75 ? "bg-teal-600 text-white" : score >= 50 ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-800";
  return <span className={`rounded-full px-2.5 py-0.5 font-bold tabular-nums ${tone} ${size}`}>{score}</span>;
}
