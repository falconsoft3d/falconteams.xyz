import type { Goal } from "@/lib/data";

/** Enlaces a la evidencia de un objetivo cumplido. */
export function GoalEvidence({ goal }: { goal: Goal }) {
  if (!goal.evidence_url && !goal.evidence_file_name) return null;
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {goal.evidence_url && (
        <a href={goal.evidence_url} target="_blank" rel="noreferrer" className="text-rose-700 hover:underline">
          ▶ Ver vídeo en YouTube
        </a>
      )}
      {goal.evidence_file_name && (
        <a href={`/api/goals/${goal.id}/file`} className="text-teal-700 hover:underline">
          📎 {goal.evidence_file_name}
        </a>
      )}
    </div>
  );
}

export function dueLabel(goal: Goal, today: string) {
  if (!goal.due_date) return null;
  const [y, m, d] = goal.due_date.split("-");
  const overdue = goal.status === "pending" && goal.due_date < today;
  return { text: `${d}/${m}/${y}`, overdue };
}
