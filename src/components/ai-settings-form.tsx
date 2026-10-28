import { ActionForm } from "./action-form";
import { btnPrimary, btnSmall, input, label } from "./ui";
import { saveAiSettings } from "@/lib/actions";
import { defaultPrompt, type CompanyAi } from "@/lib/chat";
import type { Company } from "@/lib/data";

/** Configuración del agente IA (OpenAI) de una empresa. */
export function AiSettingsForm({ company, ai }: { company: Company; ai: CompanyAi | null }) {
  const id = `ai-${company.id}`;
  return (
    <ActionForm action={saveAiSettings} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="company_id" value={company.id} />
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
        <input type="checkbox" name="enabled" defaultChecked={ai?.enabled ?? false} className="size-4 accent-teal-700" />
        Activar el agente IA en el chat de la empresa
      </label>
      <div>
        <label htmlFor={`${id}-key`} className={label}>
          Token de OpenAI {ai?.api_key_enc && <span className="font-normal text-slate-500">(guardado · vacío = no cambiar)</span>}
        </label>
        <input id={`${id}-key`} name="api_key" type="password" autoComplete="off" placeholder="sk-…" className={input} />
      </div>
      <div>
        <label htmlFor={`${id}-model`} className={label}>Modelo</label>
        <input id={`${id}-model`} name="model" defaultValue={ai?.model ?? "gpt-4o-mini"} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-prompt`} className={label}>Instrucciones del agente</label>
        <textarea id={`${id}-prompt`} name="system_prompt" rows={3} defaultValue={ai?.system_prompt ?? ""} placeholder={defaultPrompt(company)} className={input} />
      </div>
      <p className="text-xs text-slate-500 sm:col-span-2">
        El token se guarda cifrado. Los empleados verán el «Asistente IA» en el chat; sus mensajes se envían a OpenAI para generar la respuesta.
      </p>
      <div className="sm:col-span-2">
        <button className={`${btnPrimary} ${btnSmall}`}>Guardar</button>
      </div>
    </ActionForm>
  );
}
