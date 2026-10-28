// Tipos de ausencia que un empleado puede marcar en su calendario.

export const ABSENCE_TYPES = {
  vacation: { label: "Vacaciones", emoji: "🌴", paid: true, cell: "border-sky-200 bg-sky-50 text-sky-800" },
  sick: { label: "Enfermedad", emoji: "🤒", paid: true, cell: "border-violet-200 bg-violet-50 text-violet-800" },
  paid_leave: { label: "Permiso con goce de sueldo", emoji: "📄", paid: true, cell: "border-indigo-200 bg-indigo-50 text-indigo-800" },
  unpaid_leave: { label: "Permiso sin goce de sueldo", emoji: "⏸️", paid: false, cell: "border-orange-200 bg-orange-50 text-orange-800" },
} as const;

export type AbsenceType = keyof typeof ABSENCE_TYPES;

export function isAbsenceType(value: string): value is AbsenceType {
  return value in ABSENCE_TYPES;
}
