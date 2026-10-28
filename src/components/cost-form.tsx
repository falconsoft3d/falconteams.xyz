"use client";

import { useState } from "react";
import { ActionForm } from "./action-form";
import { btnSecondary, btnSmall, input } from "./ui";
import { setCost } from "@/lib/actions";
import type { Profile } from "@/lib/data";
import { formatMoney, monthlyHours, rateFromSalary } from "@/lib/money";

/** Coste del empleado: por hora, o salario mensual del que se calcula el coste por hora. */
export function CostForm({ profile }: { profile: Profile }) {
  const [mode, setMode] = useState<"rate" | "salary">(profile.monthly_salary !== null ? "salary" : "rate");
  const [salary, setSalary] = useState(profile.monthly_salary !== null ? String(profile.monthly_salary) : "");
  const [weekly, setWeekly] = useState(String(profile.weekly_hours ?? 40));
  const salaryNum = Number(salary.replace(",", "."));
  const weeklyNum = Number(weekly.replace(",", "."));
  const preview = salaryNum > 0 && weeklyNum >= 1 && weeklyNum <= 80 ? rateFromSalary(salaryNum, weeklyNum) : null;
  const tab = (value: typeof mode, text: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={`rounded-md px-2.5 py-1 text-xs font-medium ${mode === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
    >
      {text}
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
        {tab("rate", "Por hora")}
        {tab("salary", "Salario mensual")}
      </div>
      <ActionForm action={setCost} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="profile_id" value={profile.id} />
        <input type="hidden" name="mode" value={mode} />
        {mode === "rate" ? (
          <>
            <input
              name="hourly_rate"
              type="number"
              min={0}
              step="0.01"
              defaultValue={profile.hourly_rate ?? ""}
              placeholder="0,00"
              aria-label="Coste por hora"
              className={`${input} w-24! py-1.5!`}
            />
            <span className="text-sm text-slate-500">€/h</span>
          </>
        ) : (
          <>
            <input
              name="monthly_salary"
              type="number"
              min={0}
              step="0.01"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="0,00"
              aria-label="Salario mensual"
              className={`${input} w-28! py-1.5!`}
            />
            <span className="text-sm text-slate-500">€/mes ·</span>
            <input
              name="weekly_hours"
              type="number"
              min={1}
              max={80}
              step="0.5"
              value={weekly}
              onChange={(e) => setWeekly(e.target.value)}
              aria-label="Horas por semana"
              className={`${input} w-16! py-1.5!`}
            />
            <span className="text-sm text-slate-500">h/semana</span>
          </>
        )}
        <button className={`${btnSecondary} ${btnSmall}`}>Guardar</button>
      </ActionForm>
      <p className="text-xs text-slate-500">
        {mode === "salary"
          ? preview !== null
            ? `= ${formatMoney(preview)}/h (${monthlyHours(weeklyNum).toFixed(2).replace(".", ",")} h al mes)`
            : "Indica el salario y las horas semanales."
          : profile.hourly_rate !== null
            ? `Actual: ${formatMoney(profile.hourly_rate)}/h`
            : "Sin coste por hora."}
      </p>
    </div>
  );
}
