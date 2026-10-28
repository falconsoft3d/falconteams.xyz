"use client";

import { useActionState, useState } from "react";
import { applyToOffer, submitAnswers } from "@/lib/actions";
import type { DICTIONARIES } from "@/lib/i18n";
import { btnPrimary, input, label } from "./ui";

type Labels = (typeof DICTIONARIES)["es"]["jobs"];

/** Registro del candidato en una oferta (luego se le muestran las preguntas). */
export function ApplyForm({ offerId, labels }: { offerId: number; labels: Labels }) {
  const [state, action, pending] = useActionState(applyToOffer, undefined);
  return (
    <form action={action} className="space-y-3" aria-busy={pending}>
      <input type="hidden" name="offer_id" value={offerId} />
      {/* Campo trampa contra bots: oculto para las personas. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <fieldset disabled={pending} className="space-y-3">
        <div>
          <label htmlFor="name" className={label}>{labels.name}</label>
          <input id="name" name="name" required maxLength={120} autoComplete="name" className={input} />
        </div>
        <div>
          <label htmlFor="email" className={label}>{labels.email}</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={input} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="country" className={label}>{labels.country}</label>
            <input id="country" name="country" required maxLength={100} autoComplete="country-name" className={input} />
          </div>
          <div>
            <label htmlFor="city" className={label}>{labels.city}</label>
            <input id="city" name="city" required maxLength={100} autoComplete="address-level2" className={input} />
          </div>
        </div>
        <div>
          <label htmlFor="phone" className={label}>{labels.phone}</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={input} />
        </div>
        <div>
          <label htmlFor="link" className={label}>{labels.link}</label>
          <input id="link" name="link" type="url" placeholder="https://" className={input} />
        </div>
        <div>
          <label htmlFor="about" className={label}>{labels.about}</label>
          <textarea id="about" name="about" rows={4} maxLength={3000} className={input} />
        </div>
      </fieldset>
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className={`${btnPrimary} w-full`}>{pending ? labels.preparing : labels.submit}</button>
    </form>
  );
}

/** Cuestionario del candidato. */
export function AnswersForm({ token, questions, labels }: { token: string; questions: string[]; labels: Labels }) {
  const [state, action, pending] = useActionState(submitAnswers, undefined);
  return (
    <form action={action} className="space-y-5" aria-busy={pending}>
      <input type="hidden" name="token" value={token} />
      <fieldset disabled={pending} className="space-y-5">
        {questions.map((q, i) => (
          <div key={i}>
            <label htmlFor={`answer_${i}`} className="mb-1.5 flex gap-2 font-medium text-slate-900">
              <span className="text-teal-700">{i + 1}.</span>
              <span>{q}</span>
            </label>
            <textarea id={`answer_${i}`} name={`answer_${i}`} rows={4} required maxLength={4000} placeholder={labels.answer} className={input} />
          </div>
        ))}
      </fieldset>
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className={`${btnPrimary} w-full`}>{pending ? labels.sending : labels.send}</button>
    </form>
  );
}

/** Enlace de seguimiento con botón de copiar. */
export function TrackingLink({ url, labels }: { url: string; labels: Labels }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200">{url}</code>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
      >
        {copied ? labels.copied : labels.copy}
      </button>
    </div>
  );
}
