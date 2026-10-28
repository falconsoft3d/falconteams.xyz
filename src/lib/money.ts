// Costes: horas trabajadas × coste por hora del empleado.

// Pública porque también se usa en el navegador (vista previa del coste).
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "EUR";

const moneyFmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: CURRENCY });

export function formatMoney(amount: number) {
  return moneyFmt.format(amount);
}

/** Horas de un mes "medio" para una jornada semanal (52 semanas / 12 meses). */
export function monthlyHours(weeklyHours: number) {
  return (weeklyHours * 52) / 12;
}

/** Coste por hora equivalente a un salario mensual, redondeado a céntimos. */
export function rateFromSalary(monthlySalary: number, weeklyHours: number) {
  return Math.round((monthlySalary / monthlyHours(weeklyHours)) * 100) / 100;
}

/** Horas con dos decimales, tal como se facturan. */
export function billableHours(ms: number) {
  return Math.round(ms / 36000) / 100;
}

/**
 * Coste de un tiempo trabajado: horas redondeadas a dos decimales × coste/hora,
 * redondeado a céntimos. Así cuadra con la línea de la factura (horas × precio).
 */
export function costOf(ms: number, hourlyRate: number) {
  return Math.round(billableHours(ms) * hourlyRate * 100) / 100;
}
